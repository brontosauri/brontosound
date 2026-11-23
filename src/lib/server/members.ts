import { error } from '@sveltejs/kit';
import { IsNull, MoreThan } from 'typeorm';
import TypeOrm from '$lib/db';
import { Band, BandRole, Invite, Membership } from '$lib/dbEntities/band';
import { User } from '$lib/dbEntities/user';
import { validHandle } from './handles';
import { removeLinksOf } from './backline/links';
import { checkMemberSeat, seatsTaken } from './quotas';

// Who is in a band, with which role, and who is invited by handle (links: inviteLinks.ts). A band always keeps an owner.

const INVITE_DAYS = 14;

const memberships = () => TypeOrm.getRepository(Membership);
const invites = () => TypeOrm.getRepository(Invite);

/** The band's members, with their users, by name */
export async function listMembers(band: Band): Promise<Membership[]> {
    return (await memberships()).find({ where: { band: { id: band.id } }, relations: { user: true }, order: { user: { name: 'ASC' } } });
}

async function findMember(band: Band, memberId: number): Promise<Membership> {
    const member = await (await memberships()).findOne({ where: { id: memberId, band: { id: band.id } }, relations: { user: true } });
    if (!member) error(404, 'No such member');
    return member;
}

const ownerCount = async (band: Band) => (await memberships()).countBy({ band: { id: band.id }, role: BandRole.OWNER });

/** Refuses to take away a band's only owner */
async function keepAnOwner(band: Band, member: Membership): Promise<void> {
    if (member.role === BandRole.OWNER && await ownerCount(band) <= 1) {
        error(400, 'The band needs another owner first: make someone else owner');
    }
}

/** The bands the user is the only owner of: they can't leave them, or go, before handing them over */
export async function bandsOnlyOwnedBy(userId: number): Promise<Band[]> {
    const owned = await (await memberships()).find({ where: { user: { id: userId }, role: BandRole.OWNER }, relations: { band: true } });
    const only = await Promise.all(owned.map(async ({ band }) => await ownerCount(band) <= 1 ? band : null));
    return only.filter(band => band !== null);
}

export async function setRole(band: Band, memberId: number, role: BandRole): Promise<void> {
    const member = await findMember(band, memberId);
    if (role !== BandRole.OWNER) await keepAnOwner(band, member);
    await (await memberships()).update(member.id, { role });
}

/** Takes a member out of the band, with their Backline links for it. What they added stays with the band */
export async function removeMember(band: Band, memberId: number): Promise<void> {
    const member = await findMember(band, memberId);
    await keepAnOwner(band, member);
    await (await memberships()).delete(member.id);
    await removeLinksOf(member.user.id, band.id);
}

/** Invites the user at `handle`, who finds the invite in their profile. Returns their name */
export async function inviteUser(band: Band, role: BandRole, by: User, handle: unknown): Promise<string> {
    const user = await (await TypeOrm.getRepository(User)).findOneBy({ handle: validHandle(handle), removedDate: IsNull() });
    if (!user) error(404, `Nobody in the herd has the handle @${validHandle(handle)}`);
    if (await (await memberships()).existsBy({ band: { id: band.id }, user: { id: user.id } })) error(409, `${user.name} is in the band already`);
    if (await (await invites()).existsBy({ band: { id: band.id }, user: { id: user.id }, expiresDate: MoreThan(new Date()) })) {
        error(409, `${user.name} is invited already`);
    }
    await checkMemberSeat(band, { counting: await seatsTaken(band) + 1 });
    await (await invites()).insert({ band: { id: band.id }, user: { id: user.id }, role, createdBy: { id: by.id }, expiresDate: inviteExpiry() });
    return user.name;
}

/** The invites waiting for the user, with their bands */
export async function invitesFor(user: User): Promise<Invite[]> {
    return (await invites()).find({ where: { user: { id: user.id }, expiresDate: MoreThan(new Date()) }, relations: { band: true, createdBy: true } });
}

async function inviteFor(user: User, inviteId: number): Promise<Invite> {
    const invite = (await invitesFor(user)).find(invite => invite.id === inviteId);
    if (!invite) error(404, 'This invite has expired, or was withdrawn');
    return invite;
}

/** Joins the band of an invite to the user. Returns the band */
export async function acceptUserInvite(user: User, inviteId: number): Promise<Band> {
    const invite = await inviteFor(user, inviteId);
    await join(invite, user);
    return invite.band;
}

export async function declineInvite(user: User, inviteId: number): Promise<void> {
    await (await invites()).delete((await inviteFor(user, inviteId)).id);
}

const inviteExpiry = () => new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

/** The band's invites that haven't expired, with who they're for */
export async function listInvites(band: Band): Promise<Invite[]> {
    return (await invites()).find({ where: { band: { id: band.id }, expiresDate: MoreThan(new Date()) }, relations: { user: true }, order: { creationDate: 'ASC' } });
}

export async function setInviteRole(band: Band, inviteId: number, role: BandRole): Promise<void> {
    await (await invites()).update({ id: inviteId, band: { id: band.id } }, { role });
}

export async function revokeInvite(band: Band, inviteId: number): Promise<void> {
    await (await invites()).delete({ id: inviteId, band: { id: band.id } });
}

async function join(invite: Invite, user: User): Promise<void> {
    if (!await (await memberships()).existsBy({ band: { id: invite.band.id }, user: { id: user.id } })) {
        await checkMemberSeat(invite.band, { counting: await (await memberships()).countBy({ band: { id: invite.band.id } }) + 1 });
    }
    await (await memberships()).createQueryBuilder().insert()
        .values({ band: { id: invite.band.id }, user: { id: user.id }, role: invite.role })
        .orIgnore() // already a member
        .execute();
    await (await invites()).delete(invite.id);
}
