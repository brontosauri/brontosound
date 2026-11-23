import TypeOrm from '$lib/db';
import { BacklineLink } from '$lib/dbEntities/backline';
import type { Band } from '$lib/dbEntities/band';
import type { User } from '$lib/dbEntities/user';
import { dropHost } from '$lib/server/backline/liveSession';
import { isMember } from '$lib/server/bands';
import { hashToken, newToken } from '$lib/server/tokens';

// Linking, started from Backline: it makes up a request id and opens /backline/link with it; the user confirms
// there; Backline, asking every few seconds, then gets its token, once
const LINK_REQUEST_MS = 10 * 60 * 1000;
const confirmedLinks = new Map<string, { token: string, expires: number }>();

export function isLinkRequest(request: unknown): request is string {
    return typeof request === 'string' && /^[0-9a-f]{32}$/.test(request);
}

/** Links the Backline that made `request` to `userId`, playing for one of their bands */
export async function confirmLink(request: string, userId: number, bandId: number): Promise<void> {
    const token = newToken();
    const links = await TypeOrm.getRepository(BacklineLink);
    await links.save(links.create({ tokenHash: hashToken(token), createdBy: { id: userId }, band: { id: bandId } }));
    confirmedLinks.set(request, { token, expires: Date.now() + LINK_REQUEST_MS });
}

/** The token for a confirmed request, handed out once; null while it is not confirmed */
export function claimLink(request: string): string | null {
    const now = Date.now();
    confirmedLinks.forEach((link, key) => link.expires < now && confirmedLinks.delete(key));
    const link = confirmedLinks.get(request);
    confirmedLinks.delete(request);
    return link?.token ?? null;
}

export async function listLinks(userId: number): Promise<{ id: number, creationDate?: Date, bandName: string }[]> {
    const links = await (await TypeOrm.getRepository(BacklineLink)).findBy({ createdBy: { id: userId } });
    return links.map(({ id, creationDate, band }) => ({ id, creationDate, bandName: band.name }));
}

export async function removeLink(userId: number, id: number): Promise<void> {
    const links = await TypeOrm.getRepository(BacklineLink);
    const link = await links.findOneBy({ id, createdBy: { id: userId } });
    if (link) {
        await links.remove(link);
        dropHost(link.tokenHash);
    }
}

/** Removes a user's links (for one band, or all), and cuts off their Backline if it is live */
export async function removeLinksOf(userId: number, bandId?: number): Promise<void> {
    const links = await TypeOrm.getRepository(BacklineLink);
    const userLinks = await links.findBy({ createdBy: { id: userId }, ...(bandId && { band: { id: bandId } }) });
    await links.remove(userLinks);
    userLinks.forEach(link => dropHost(link.tokenHash));
}

/** The active user a Backline's token belongs to, and the band it plays for, while they are in it */
export async function findLink(token: string): Promise<{ user: User, band: Band } | null> {
    const link = await (await TypeOrm.getRepository(BacklineLink)).findOneBy({ tokenHash: hashToken(token) });
    const user = link?.createdBy;
    const active = user && !user.removedDate && !user.suspendedDate && !link.band.suspendedDate;
    return active && await isMember(user.id, link.band.id) ? { user, band: link.band } : null;
}
