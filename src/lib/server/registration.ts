import { error, type Cookies } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import TypeOrm from '$lib/db';
import type { InviteLink } from '$lib/dbEntities/band';
import { HerdRole, User, UserAccount } from '$lib/dbEntities/user';
import { claimHandle, validHandle } from './handles';
import { herdSettings, Registrations } from './herdSettings';
import { findHerdInvite, useHerdInvite } from './herdInvites';
import { findLink } from './inviteLinks';
import { hashPassword } from './password';
import { newToken } from './tokens';
import type { TermsAcceptance } from './legal/acceptance';
import { countLoginAttempt, findUserByLogin, isUniqueViolation, MAX_LOGIN_ATTEMPTS, newPasswordProblem, normalizeEmail } from './users';

// Joining the herd (/join), as its registrations allow: open, with a band's invite link, or not at all; or with
// a herd admin's invite (/welcome/<token>), whatever they allow

/**
 * The cookie that keeps an invite link's token while its visitor signs up or in: back at the link, signed in,
 * they join (/join/<token>). Google sign-ups need it too
 */
export const INVITE_COOKIE = 'joinInvite';

/** The working invite link a visitor signs up or in with, kept for when they're back at it */
export async function rememberInvite(cookies: Cookies, token: string | null): Promise<InviteLink | null> {
    const found = token ? await findLink(token) : null;
    if (!found || found.end) return null;
    cookies.set(INVITE_COOKIE, token!, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 });
    return found.link;
}

/** Whether someone may join now: registrations are open, or invite only and they hold a working invite link */
export async function mayJoin(inviteToken: string | null | undefined): Promise<boolean> {
    const { registrations } = herdSettings();
    return registrations == Registrations.OPEN
        || (registrations == Registrations.INVITE && !!inviteToken && (await findLink(inviteToken))?.end === null);
}

type AccountInput = { name: unknown, handle: unknown, password: unknown } & TermsAcceptance;

/** A new user with a password, refused when they may not join. Throttled per address */
export async function register(input: AccountInput & { email: unknown }, inviteToken: string | null): Promise<User> {
    throttleSignUps();
    if (!await mayJoin(inviteToken)) error(403, "This herd isn't open to new people right now");
    const email = normalizeEmail(String(input.email ?? ''));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error(400, 'Invalid email address');
    const account = await accountFields(input);
    return claimHandle(account.handle, async () => {
        if (await findUserByLogin(email)) error(409, 'There is already an account with this email: sign in instead');
        return saveNewUser({ ...account, email, username: email, unconfirmedEmail: herdSettings().confirmEmails });
    });
}

/**
 * A new user from a herd admin's invite (herdInvites.ts), with its herd role and email: the link came there. A link
 * invite has none: they sign in with their handle. A removed user's email gets their account back
 */
export async function acceptHerdInvite(token: string, input: AccountInput): Promise<User> {
    throttleSignUps();
    const invite = await findHerdInvite(token);
    if (!invite) error(404, 'This invitation has expired, or was used already');
    const account = await accountFields(input);
    return claimHandle(account.handle, async () => {
        const removed = invite.email ? await findUserByLogin(invite.email) : null;
        if (removed && !removed.removedDate) error(409, 'There is already an account with this email: sign in instead');
        await useHerdInvite(invite.id);
        return saveNewUser({
            ...removed, ...account, email: invite.email, username: invite.email ?? `no-email:${newToken()}`, herdRole: invite.herdRole,
            removedDate: null, suspendedDate: null, totpEnabled: false, totpSecret: null,
        });
    });
}

function throttleSignUps(): void {
    if (countLoginAttempt(`join|${getRequestEvent().getClientAddress()}`) > MAX_LOGIN_ATTEMPTS) error(429, 'Too many sign-ups from here. Try again in 15 minutes');
}

/** What everyone picks for a new account, checked: display name, handle and password (hashed); and their acceptance */
async function accountFields(input: AccountInput): Promise<Pick<User, 'name' | 'handle' | 'passwordHash'> & TermsAcceptance & { handle: string }> {
    const name = String(input.name ?? '').trim().slice(0, 100);
    const handle = validHandle(input.handle);
    const password = String(input.password ?? '');
    if (!name) error(400, 'Your display name, please');
    const problem = await newPasswordProblem(password);
    if (problem) error(400, problem);
    return { name, handle, passwordHash: await hashPassword(password), termsAcceptedAt: input.termsAcceptedAt, termsVersion: input.termsVersion };
}

async function saveNewUser(fields: Partial<User>): Promise<User> {
    const users = await TypeOrm.getRepository(User);
    try {
        return await users.save(users.create({ herdRole: HerdRole.USER, ...fields }));
    } catch (e) {
        if (isUniqueViolation(e)) error(409, 'There is already an account with this email: sign in instead');
        throw e;
    }
}

/**
 * At a first Google sign-in with no account for its verified email: creates one, without a handle (they pick it),
 * if the herd lets people join with Google now. Returns whether it did. They accept the Terms next (/accept)
 */
export async function joinWithGoogle(email: string, name: string, providerAccountId: string): Promise<boolean> {
    const event = getRequestEvent();
    if (!herdSettings().googleSignUp || await findUserByLogin(email) || !await mayJoin(event.cookies.get(INVITE_COOKIE))) {
        return false;
    }
    const user = await saveNewUser({ email, username: email, name: name.slice(0, 100) || email, mustAcceptTerms: true });
    await (await TypeOrm.getRepository(UserAccount)).insert({ user: { id: user.id }, provider: 'google', providerAccountId, email });
    return true;
}
