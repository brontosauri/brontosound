import { error, isHttpError } from '@sveltejs/kit';
import { MoreThan } from 'typeorm';
import TypeOrm from '$lib/db';
import { HerdInvite, HerdRole, User } from '$lib/dbEntities/user';
import { sendHerdInvite } from './emailLinks';
import { hashToken, newToken } from './tokens';
import { findUserByLogin, normalizeEmail } from './users';

// Herd admins invite people (/admin/users): by email, or with a link they pass on. Whoever accepts picks their
// display name, handle and password at /welcome/<token> (registration.ts)

const INVITE_DAYS = 14;

const invites = () => TypeOrm.getRepository(HerdInvite);

export interface HerdInviteItem {
    id: number;
    email: string | null; // null: a link
    herdRole: HerdRole;
    notSent: boolean;
    expiresDate: Date;
    by: string | null;
}

export async function listHerdInvites(): Promise<HerdInviteItem[]> {
    const all = await (await invites()).find({ relations: { createdBy: true }, order: { creationDate: 'ASC' } });
    return all.map(({ id, email, herdRole, notSent, expiresDate, createdBy }) => ({ id, email, herdRole, notSent, expiresDate, by: createdBy?.name ?? null }));
}

/** Where an invite was emailed, and whether it went: if not, it waits in the list to be sent again */
export type Delivery = { email: string, sent: boolean };

export async function inviteByEmail(email: unknown, herdRole: HerdRole, by: User, origin: string): Promise<Delivery> {
    const address = normalizeEmail(String(email ?? ''));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) error(400, 'Invalid email address');
    const existing = await findUserByLogin(address);
    if (existing && !existing.removedDate) error(409, 'Someone in the herd has this email already');
    if (await (await invites()).existsBy({ email: address })) error(409, `${address} is invited already: send it again from the list`);
    const { invite, token } = await createInvite({ email: address, herdRole, createdBy: { id: by.id } as User });
    return deliver(invite, token, origin);
}

/** A link inviting whoever opens it, with `herdRole`. Returns its address */
export async function createInviteLink(herdRole: HerdRole, by: User, origin: string): Promise<string> {
    const { token } = await createInvite({ email: null, herdRole, createdBy: { id: by.id } as User });
    return welcomeUrl(origin, token);
}

/** Emails an invite again, for 14 more days; its earlier link stops working */
export async function sendAgain(id: number, origin: string): Promise<Delivery> {
    const { invite, token } = await renew(id);
    if (!invite.email) error(400, 'This invite is a link: make a new one instead');
    return deliver(invite, token, origin);
}

/** A new address for a link invite, for 14 more days; the old one stops working */
export async function newInviteLink(id: number, origin: string): Promise<string> {
    const { invite, token } = await renew(id);
    if (invite.email) error(400, 'This invite goes by email: send it again instead'); // its link proves the address
    return welcomeUrl(origin, token);
}

export async function withdrawInvite(id: number): Promise<void> {
    await (await invites()).delete(id);
}

/** The invite a token is for, while it works */
export async function findHerdInvite(token: string): Promise<HerdInvite | null> {
    return (await invites()).findOneBy({ tokenHash: hashToken(token), expiresDate: MoreThan(new Date()) });
}

/** Uses the invite up; refuses one used meanwhile */
export async function useHerdInvite(id: number): Promise<void> {
    const { affected } = await (await invites()).delete(id);
    if (!affected) error(404, 'This invitation has expired, or was used already');
}

const welcomeUrl = (origin: string, token: string) => `${origin}/welcome/${token}`;

const freshToken = () => {
    const token = newToken();
    return { token, link: { tokenHash: hashToken(token), expiresDate: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000) } };
};

async function createInvite(fields: Partial<HerdInvite>): Promise<{ invite: HerdInvite, token: string }> {
    const { token, link } = freshToken();
    return { invite: await (await invites()).save({ ...fields, ...link }), token };
}

async function renew(id: number): Promise<{ invite: HerdInvite, token: string }> {
    const invite = await (await invites()).findOneBy({ id });
    if (!invite) error(404, 'No such invite');
    const { token, link } = freshToken();
    await (await invites()).update(id, link);
    return { invite, token };
}

async function deliver(invite: HerdInvite, token: string, origin: string): Promise<Delivery> {
    const email = invite.email!;
    let sent = true;
    try {
        await sendHerdInvite(email, welcomeUrl(origin, token));
    } catch (e) {
        if (!isHttpError(e)) throw e; // no email set up, or it failed: logged by mail.ts
        sent = false;
    }
    await (await invites()).update(invite.id, { notSent: !sent });
    return { email, sent };
}
