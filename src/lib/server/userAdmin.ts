import { error } from '@sveltejs/kit';
import { IsNull, Like, Not } from 'typeorm';
import TypeOrm from '$lib/db';
import { Invite, Membership } from '$lib/dbEntities/band';
import { HerdRole, PasswordLink, User, UserAccount, Visibility } from '$lib/dbEntities/user';
import { removeLinksOf } from './backline/links';
import { claimHandle, validHandle } from './handles';
import { bandsOnlyOwnedBy } from './members';
import { deletePicture } from './pictures';
import { isBuiltInAdmin } from './users';

// What herd admins do with the herd's users (/admin/users)

export interface UserListItem {
    id: number;
    name: string;
    handle: string | null;
    email: string | null;
    herdRole: HerdRole;
    bandCount: number;
    signInMethods: string[];
    suspended: boolean;
    builtIn: boolean; // the built-in admin, configured in config/config.json
    creationDate: Date;
}

export async function listUsers(): Promise<UserListItem[]> {
    const db = await TypeOrm.getDb();
    const users = await db.getRepository(User).createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .leftJoinAndSelect('user.accounts', 'account')
        .where('user.removedDate IS NULL')
        .orderBy('user.name')
        .getMany();
    const bandCounts: { user: number, bands: number }[] = await db.getRepository(Membership).createQueryBuilder('membership')
        .select('membership.userId', 'user').addSelect('COUNT(*)', 'bands').groupBy('membership.userId').getRawMany();
    return users.map(user => ({
        id: user.id,
        name: user.name,
        handle: user.handle,
        email: user.email,
        herdRole: user.herdRole,
        bandCount: Number(bandCounts.find(count => count.user === user.id)?.bands ?? 0),
        signInMethods: [
            ...(user.passwordHash ? ['password'] : []),
            ...(user.totpEnabled ? ['two-step'] : []),
            ...new Set(user.accounts?.map(account => account.provider)),
        ],
        suspended: !!user.suspendedDate,
        builtIn: isBuiltInAdmin(user),
        creationDate: user.creationDate,
    }));
}

/** A user who isn't removed, suspended or not; 404 otherwise */
async function findUser(id: number): Promise<User> {
    const user = await (await TypeOrm.getRepository(User)).findOneBy({ id, removedDate: IsNull() });
    if (!user) error(404, 'User not found');
    return user;
}

/** Refuses changes an admin can't make to themselves, or to the built-in admin */
async function otherUser(id: number, by: User, change: string): Promise<User> {
    if (id === by.id) error(400, `You can't ${change} yourself`);
    const user = await findUser(id);
    if (isBuiltInAdmin(user)) error(400, `The built-in admin is configured in config/config.json: you can't ${change} it here`);
    return user;
}

export async function setHerdRole(id: number, herdRole: HerdRole, by: User): Promise<void> {
    await otherUser(id, by, 'change the herd role of');
    await (await TypeOrm.getRepository(User)).update(id, { herdRole });
}

/** They can't sign in until restored (their sessions end); their bands keep working */
export async function suspendUser(id: number, by: User): Promise<void> {
    await otherUser(id, by, 'suspend');
    const users = await TypeOrm.getRepository(User);
    await users.update(id, { suspendedDate: new Date() });
    await users.increment({ id }, 'sessionVersion', 1);
    await removeLinksOf(id); // their Backline goes offline, and needs linking again
}

export async function restoreUser(id: number): Promise<void> {
    await findUser(id);
    await (await TypeOrm.getRepository(User)).update(id, { suspendedDate: null });
}

/** A new handle for the user: the old one is free for others */
export async function renameUserHandle(id: number, handle: unknown): Promise<void> {
    await findUser(id);
    const newHandle = validHandle(handle);
    await claimHandle(newHandle, async () => (await TypeOrm.getRepository(User)).update(id, { handle: newHandle }));
}

export async function removeUser(id: number, by: User): Promise<void> {
    await removeAccount(await otherUser(id, by, 'remove'));
}

/** Their own choice, in their profile */
export async function deleteOwnAccount(user: User): Promise<void> {
    if (isBuiltInAdmin(user)) error(400, 'The built-in admin is configured in config/config.json: turn it off in herd settings instead');
    await removeAccount(user);
}

/**
 * What's left of a removed user: the row, so what they added to bands stays signed, as "Former member". Their
 * name, email, profile and sign-in methods go (the Privacy Policy promises it)
 */
const anonymous = (id: number): Partial<User> => ({
    username: `removed:${id}`, name: 'Former member', email: null, handle: null, avatar: null, passwordHash: null,
    about: '', instruments: '', city: '', website: '', visibility: Visibility.HIDDEN, locale: null, soundfont: null,
    totpSecret: null, totpEnabled: false, totpLastStep: null, quotaOverrides: {},
});

// Revokes all sign-in methods, sessions, bands, invites and Backline links, and anonymises the user; see
// `User.removedDate`. A band's only owner can't go
async function removeAccount(user: User): Promise<void> {
    const { id } = user;
    const onlyOwned = await bandsOnlyOwnedBy(id);
    if (onlyOwned.length > 0) {
        error(400, `${user.name} is the only owner of ${onlyOwned.map(band => band.name).join(', ')}: those bands need another owner first`);
    }
    const db = await TypeOrm.getDb();
    await db.transaction(async manager => {
        await manager.delete(Membership, { user: { id } });
        await manager.delete(UserAccount, { user: { id } });
        await manager.delete(Invite, { user: { id } });
        await manager.delete(PasswordLink, { user: { id } });
        await manager.update(User, id, { ...anonymous(id), removedDate: new Date() });
        await manager.increment(User, { id }, 'sessionVersion', 1);
    });
    await removeLinksOf(id);
    await deletePicture(user.avatar);
}

/** Users removed before removal anonymised them: anonymised at startup */
export async function anonymiseRemovedUsers(): Promise<void> {
    const users = await TypeOrm.getRepository(User);
    for (const { id } of await users.findBy({ removedDate: Not(IsNull()), username: Not(Like('removed:%')) })) {
        await users.update(id, anonymous(id));
    }
}
