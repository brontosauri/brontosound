import { CredentialsSignin } from '@auth/sveltekit';
import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { IsNull, Not, QueryFailedError } from 'typeorm';
import TypeOrm from '$lib/db';
import { HerdRole, User, UserAccount } from '$lib/dbEntities/user';
import { herdSettings } from '$lib/server/herdSettings';
import { instanceConfig } from '$lib/server/instanceConfig';
import { hashPassword, isPasswordHash, MAX_PASSWORD_LENGTH, PasswordCheckBusy, passwordProblem, verifyPassword } from '$lib/server/password';
import { DEFAULT_ADMIN_USERNAME, configPath } from '$lib/server/config';
import { addressBlocked, loginWait, recordFailure, recordSuccess } from '$lib/server/loginThrottle';
import { breachCount } from '$lib/server/breachedPasswords';
import { useTwoStepCode } from '$lib/server/twoStep';


export class TooManyLoginAttempts extends CredentialsSignin {
    code = 'too_many_attempts';
}

// This login failed repeatedly: it may try again in a minute at most (see loginThrottle.ts)
export class LoginCoolingDown extends CredentialsSignin {
    code = 'slow_down';
}

// The password was right, and the user has two-step verification: the code from their app is needed too
export class TwoStepRequired extends CredentialsSignin {
    code = 'two_step_required';
}

export class TwoStepInvalid extends CredentialsSignin {
    code = 'two_step_invalid';
}

// The password was right, but the account's email isn't confirmed yet (herd setting `confirmEmails`)
export class EmailUnconfirmed extends CredentialsSignin {
    code = 'unconfirmed';
}

// Too many sign-ins at once (see MAX_QUEUED_SCRYPT): nothing was checked
export class SignInBusy extends CredentialsSignin {
    code = 'busy';
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

// The built-in admin is configured in config/config.json, so it can't be removed or suspended from the UI
export function isBuiltInAdmin(user: User): boolean {
    return user.username === DEFAULT_ADMIN_USERNAME;
}

export function isUniqueViolation(e: unknown): boolean {
    return e instanceof QueryFailedError && e.message.includes('UNIQUE constraint failed');
}

/** The user who signs in as `login`: their email, their handle (with or without @), or `admin` */
/** What the user signs in with, as shown to them */
export function loginOf(user: User): string {
    return user.email ?? (user.handle ? `@${user.handle}` : user.username);
}

export async function findUserByLogin(login: string, withPasswordHash = false): Promise<User | null> {
    login = normalizeEmail(login);
    const query = (await TypeOrm.getRepository(User)).createQueryBuilder('user')
        .where('(LOWER(user.email) = :login OR LOWER(user.username) = :login OR user.handle = :handle)', { login, handle: login.replace(/^@/, '') });
    if (withPasswordHash) {
        query.addSelect('user.passwordHash');
    }
    return query.getOne();
}

/** The user, if not removed or suspended */
export async function findActiveUser(id: number): Promise<User | null> {
    const user = await (await TypeOrm.getRepository(User)).findOneBy({ id, removedDate: IsNull(), suspendedDate: IsNull() });
    return user && mayUseAccount(user) ? user : null;
}

// The built-in admin signs in only with its password: turning that off (`adminPasswordSignIn`) disables the account
function mayUseAccount(user: User): boolean {
    return user.username !== DEFAULT_ADMIN_USERNAME || herdSettings().adminPasswordSignIn;
}

// Compared against when the login matches no user, so response time doesn't reveal which emails exist
let dummyHash: Promise<string> | null = null;

// Brute-force guard: at most MAX_LOGIN_ATTEMPTS per key per window, reset on success. Sign-in keys include the
// client address, so nobody can lock out a known login (like `admin`) for everyone
export const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number, windowStart: number }>();

function clientAddress(): string {
    try {
        return getRequestEvent().getClientAddress();
    } catch {
        return 'unknown';
    }
}

export function countLoginAttempt(key: string): number {
    const now = Date.now();
    if (loginAttempts.size > 10_000) {
        loginAttempts.forEach((entry, key) => now - entry.windowStart > LOGIN_WINDOW_MS && loginAttempts.delete(key));
    }
    const entry = loginAttempts.get(key);
    if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
        loginAttempts.set(key, { count: 1, windowStart: now });
        return 1;
    }
    return ++entry.count;
}

/** The user, if the password (and with two-step, the code) is right. Throttled; throws to ask for a code. */
export async function authenticateWithPassword(login: string, password: string, code = ''): Promise<User | null> {
    if (!login || !password || password.length > MAX_PASSWORD_LENGTH) {
        return null;
    }
    login = normalizeEmail(login);
    const address = clientAddress();
    const attemptKey = `${address}|${login}`;
    if (countLoginAttempt(attemptKey) > MAX_LOGIN_ATTEMPTS || addressBlocked(address)) {
        throw new TooManyLoginAttempts();
    }
    if (loginWait(login) > 0) {
        throw new LoginCoolingDown();
    }
    const user = await findUserByLogin(login, true);
    let valid = false;
    try {
        if (user && !user.removedDate && !user.suspendedDate && user.passwordHash && mayUseAccount(user)) {
            valid = await verifyPassword(password, user.passwordHash);
        } else {
            await verifyPassword(password, await (dummyHash ??= hashPassword('dummy'))); // takes as long as a real check
        }
    } catch (e) {
        throw e instanceof PasswordCheckBusy ? new SignInBusy() : e;
    }
    if (!valid || !user) {
        recordFailure(login, address);
        return null;
    }
    if (user.unconfirmedEmail) {
        throw new EmailUnconfirmed();
    }
    if (user.totpEnabled) {
        if (!code) {
            throw new TwoStepRequired();
        }
        if (!await useTwoStepCode(user.id, code)) {
            recordFailure(login, address);
            throw new TwoStepInvalid();
        }
    }
    loginAttempts.delete(attemptKey);
    recordSuccess(login);
    return user;
}

// For signed-in users confirming their password: throttled per user, separately from sign-in
export async function verifyCurrentPassword(id: number, password: string): Promise<boolean> {
    const attemptKey = `user:${id}`;
    if (countLoginAttempt(attemptKey) > MAX_LOGIN_ATTEMPTS) {
        throw new TooManyLoginAttempts();
    }
    const user = await (await TypeOrm.getRepository(User)).createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.id = :id', { id })
        .getOne();
    if (!user?.passwordHash || password.length > MAX_PASSWORD_LENGTH || !await verifyPassword(password, user.passwordHash)) {
        return false;
    }
    loginAttempts.delete(attemptKey);
    return true;
}

export async function findUserByAccount(provider: string, providerAccountId: string): Promise<User | null> {
    const account = await (await TypeOrm.getRepository(UserAccount)).findOne({
        where: { provider, providerAccountId },
        relations: { user: true },
    });
    return account && !account.user.removedDate && !account.user.suspendedDate ? account.user : null;
}

// Returns the user behind an external account, linking it first if it is new and `verifiedEmail` matches an active user
export async function findOrLinkUser(provider: string, providerAccountId: string, verifiedEmail: string): Promise<User | null> {
    const linkedUser = await findUserByAccount(provider, providerAccountId);
    if (linkedUser) {
        return linkedUser;
    }
    const user = await findUserByLogin(verifiedEmail, true);
    if (!user?.email || user.removedDate || user.suspendedDate || normalizeEmail(user.email) !== normalizeEmail(verifiedEmail)) {
        return null;
    }
    // orIgnore: a concurrent sign-in may have just linked it
    await (await TypeOrm.getRepository(UserAccount)).createQueryBuilder().insert()
        .values({ user: { id: user.id }, provider, providerAccountId, email: normalizeEmail(verifiedEmail) })
        .orIgnore()
        .execute();
    return findUserByAccount(provider, providerAccountId);
}

// Creates or updates the built-in herd admin from config/config.json; called at startup. Fails if the hash is
// missing, unless `adminPasswordSignIn` is off
export async function ensureDefaultAdmin(): Promise<void> {
    const { adminPasswordHash } = instanceConfig();
    const { adminPasswordSignIn } = herdSettings();
    if (adminPasswordSignIn && !isPasswordHash(adminPasswordHash)) {
        throw new Error(`${configPath}: "adminPasswordHash" is missing or invalid. Generate it with: npm run hash-password`);
    }
    const passwordHash = isPasswordHash(adminPasswordHash) ? adminPasswordHash : null;
    const users = await TypeOrm.getRepository(User);
    if (!adminPasswordSignIn && !await users.existsBy({ herdRole: HerdRole.ADMIN, removedDate: IsNull(), username: Not(DEFAULT_ADMIN_USERNAME) })) {
        console.warn(`"adminPasswordSignIn" is off and there is no other herd admin: nobody can manage users or settings`);
    }
    const admin = await findUserByLogin(DEFAULT_ADMIN_USERNAME, true)
        ?? users.create({ username: DEFAULT_ADMIN_USERNAME, name: 'Admin', email: null, sessionVersion: 0 });
    if (admin.id && admin.passwordHash === passwordHash && admin.herdRole === HerdRole.ADMIN && !admin.removedDate) {
        return;
    }
    if (admin.id && admin.passwordHash !== passwordHash) {
        admin.sessionVersion++; // password changed in settings: sign out everywhere, and reset two-step (lost device)
        Object.assign(admin, { totpEnabled: false, totpSecret: null, totpLastStep: null });
    }
    Object.assign(admin, { passwordHash, herdRole: HerdRole.ADMIN, removedDate: null });
    await users.save(admin);
}

/** What's wrong with a new password, or null: its length, or being found in data breaches (`breachedPasswordCheck`) */
export async function newPasswordProblem(password: string): Promise<string | null> {
    const problem = passwordProblem(password);
    if (problem || !herdSettings().breachedPasswordCheck) return problem;
    const count = await breachCount(password);
    if (count === null) console.warn("Couldn't check a new password against known breaches: allowed");
    return count ? 'This password has appeared in data breaches. Choose another one.' : null;
}

export async function getProfile(id: number) {
    const user = await (await TypeOrm.getRepository(User)).createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.id = :id', { id })
        .getOneOrFail();
    const { name, handle, herdRole, about, instruments, city, website, visibility, showBands, locale, avatar } = user;
    return {
        name, handle, herdRole, about, instruments, city, website, visibility, showBands, locale, avatar,
        login: loginOf(user),
        hasPassword: !!user.passwordHash,
        twoStepEnabled: user.totpEnabled,
        isDefaultAdmin: user.username === DEFAULT_ADMIN_USERNAME,
    };
}

// Ends all the user's sessions, current one included: they carry the old `sessionVersion`
export async function signOutEverywhere(id: number): Promise<void> {
    await (await TypeOrm.getRepository(User)).increment({ id }, 'sessionVersion', 1);
}

// Also signs the user out everywhere, current session included
export async function changePassword(id: number, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    const db = await TypeOrm.getDb();
    await db.transaction(async manager => {
        await manager.update(User, id, { passwordHash });
        await manager.increment(User, { id }, 'sessionVersion', 1);
    });
}
