import { error } from '@sveltejs/kit';
import { IsNull, MoreThan, Raw } from 'typeorm';
import TypeOrm from '$lib/db';
import { Band, BandRole, InviteLink, Membership } from '$lib/dbEntities/band';
import type { User } from '$lib/dbEntities/user';
import { checkMemberSeat, quotaFor, roomLeft, seatsTaken } from './quotas';
import { newToken } from './tokens';

// A band's invite link: whoever opens it joins as viewer, while it has places left, until its day (docs/herd.md)

const MAX_DAYS = 14, DEFAULT_DAYS = 7;

/** Why a link no longer works */
export type LinkEnd = 'expired' | 'used up' | 'revoked' | 'band full';

const links = () => TypeOrm.getRepository(InviteLink);
const memberCount = async (band: Band) => (await TypeOrm.getRepository(Membership)).countBy({ band: { id: band.id } });

/** A day as date inputs write it, in the herd's time */
export const inputDay = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, '0')).join('-');

function dayFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return inputDay(date);
}

/** The days a link may be valid until, and the one it starts with */
export const validUntilRange = () => ({ min: dayFromToday(0), max: dayFromToday(MAX_DAYS), initial: dayFromToday(DEFAULT_DAYS) });

/** The end of the day a date input wrote, within validUntilRange() */
function validUntil(value: unknown): Date {
    const { min, max } = validUntilRange();
    if (typeof value != 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < min || value > max) {
        error(400, `An invite link works for ${MAX_DAYS} days at most`);
    }
    return new Date(`${value}T23:59:59.999`); // local time
}

function validPlaces(value: unknown, min: number, max: number | null): number {
    const places = Number(value);
    if (!Number.isInteger(places) || places < min) error(400, `People: ${min} at least`);
    if (max !== null && places > max) error(403, `People: ${max} at most, with the band's seats left`);
    return places;
}

const working = () => ({ revokedDate: IsNull(), expiresDate: MoreThan(new Date()), joined: Raw(joined => `${joined} < places`) });

/** The band's working link, with its token */
export async function bandLink(band: Band): Promise<InviteLink | null> {
    return (await links()).findOne({ where: { band: { id: band.id }, ...working() }, select: { id: true, token: true, places: true, joined: true, expiresDate: true } });
}

/** A new link for the band, taking over its old one. Refused while one works */
export async function createLink(band: Band, by: User, input: { places: unknown, until: unknown }): Promise<void> {
    if (await bandLink(band)) error(409, 'The band has a link already');
    const places = validPlaces(input.places, 1, roomLeft(quotaFor('membersPerBand', band), await seatsTaken(band)));
    const old = await (await links()).findOneBy({ band: { id: band.id } });
    await (await links()).save({ id: old?.id, band: { id: band.id }, token: newToken(), places, joined: 0, createdBy: { id: by.id }, expiresDate: validUntil(input.until), revokedDate: null });
}

/** Changes the working link's people and day; never fewer people than joined */
export async function updateLink(band: Band, input: { places: unknown, until: unknown }): Promise<void> {
    const link = await bandLink(band);
    if (!link) error(404, 'This link no longer works');
    const left = roomLeft(quotaFor('membersPerBand', band), await seatsTaken(band));
    const places = validPlaces(input.places, Math.max(1, link.joined), left === null ? null : link.places + left);
    await (await links()).update(link.id, { places, expiresDate: validUntil(input.until) });
}

export async function revokeLink(band: Band): Promise<void> {
    await (await links()).update({ band: { id: band.id }, revokedDate: IsNull() }, { revokedDate: new Date() });
}

/** The link a token is for, with its band and who made it, and why it no longer works, if it doesn't */
export async function findLink(token: string): Promise<{ link: InviteLink, end: LinkEnd | null } | null> {
    const link = await (await links()).findOne({ where: { token }, relations: { band: true, createdBy: true } });
    return link && { link, end: await linkEnd(link) };
}

/** What the pages a link leads to show of it */
export const joiningBand = ({ band, createdBy }: InviteLink) =>
    ({ name: band.name, handle: band.handle, logo: band.logo, invitedBy: createdBy?.name ?? null, role: BandRole.VIEWER });

async function linkEnd(link: InviteLink): Promise<LinkEnd | null> {
    if (link.revokedDate) return 'revoked';
    if (link.joined >= link.places) return 'used up';
    if (link.expiresDate <= new Date()) return 'expired';
    if (roomLeft(quotaFor('membersPerBand', link.band), await memberCount(link.band)) === 0) return 'band full';
    return null;
}

/** Joins the link's band as viewer, taking one of its places (a member already keeps their role). Returns the band */
export async function joinWithLink(token: string, user: User): Promise<Band> {
    const found = await findLink(token);
    if (!found || found.end) error(410, 'This invite link no longer works');
    const { band } = found.link;
    const memberships = await TypeOrm.getRepository(Membership);
    if (await memberships.existsBy({ band: { id: band.id }, user: { id: user.id } })) return band;
    await checkMemberSeat(band, { counting: await memberCount(band) + 1 });
    // Taken only while a place is left: two people can't both get the last one
    const { affected } = await (await links()).createQueryBuilder().update()
        .set({ joined: () => 'joined + 1' })
        .where('id = :id AND joined < places AND revokedDate IS NULL', { id: found.link.id })
        .execute();
    if (!affected) error(410, 'This invite link no longer works');
    await memberships.insert({ band: { id: band.id }, user: { id: user.id }, role: BandRole.VIEWER });
    return band;
}
