import { readdir, stat } from 'fs/promises';
import path from 'path';
import { error } from '@sveltejs/kit';
import { IsNull, MoreThan } from 'typeorm';
import TypeOrm from '$lib/db';
import { Band, BandStorage, Invite, InviteLink, Membership } from '$lib/dbEntities/band';
import type { User } from '$lib/dbEntities/user';
import { formatLimit, type Limit, type QuotaKey, type QuotaOverrides } from '$lib/quotas';
import { filesRoot } from './config';
import { herdSettings } from './herdSettings';

// The herd's quotas, and their checks: the herd's default, or the person's or band's override ($lib/quotas.ts)

/** The limit that applies to the user or band: their override, else the herd's default */
export function quotaFor(key: QuotaKey, owner: { quotaOverrides?: QuotaOverrides }): Limit {
    const override = owner.quotaOverrides?.[key];
    return override ? override.limit : herdSettings().quotas[key];
}

/** The room left under a limit, or null when there's no limit */
export const roomLeft = (limit: Limit, used: number) => limit === null ? null : Math.max(0, limit - used);

const GB = 1024 ** 3, MB = 1024 ** 2;

export async function bandsCreatedBy(user: User): Promise<number> {
    return (await TypeOrm.getRepository(Band)).countBy({ createdBy: { id: user.id } });
}

export async function checkCanCreateBand(user: User): Promise<void> {
    const limit = quotaFor('bandsPerUser', user);
    if (roomLeft(limit, await bandsCreatedBy(user)) === 0) {
        error(403, `You can create ${formatLimit('bandsPerUser', limit)} on this herd. Ask its admins for more`);
    }
}

/** Members, pending invites, and the places left on the band's invite link: all may become members */
export async function seatsTaken(band: Band): Promise<number> {
    const db = await TypeOrm.getDb();
    const now = MoreThan(new Date());
    const link = await db.getRepository(InviteLink).findOneBy({ band: { id: band.id }, revokedDate: IsNull(), expiresDate: now });
    return await db.getRepository(Membership).countBy({ band: { id: band.id } })
        + await db.getRepository(Invite).countBy({ band: { id: band.id }, expiresDate: now })
        + (link ? Math.max(0, link.places - link.joined) : 0);
}

/** The band's seats, taken and allowed (null: no limit) */
export async function memberSeats(band: Band): Promise<{ taken: number, limit: Limit }> {
    return { taken: await seatsTaken(band), limit: quotaFor('membersPerBand', band) };
}

export async function checkMemberSeat(band: Band, { counting }: { counting: number }): Promise<void> {
    const limit = quotaFor('membersPerBand', band);
    if (limit !== null && counting > limit) {
        error(403, `${band.name} has room for ${formatLimit('membersPerBand', limit)}, invites included`);
    }
}

// Herd storage used per band, kept for a minute and forgotten when the band writes
const USAGE_MS = 60_000;
const usage = new Map<number, { bytes: number, at: number }>();

async function folderBytes(folder: string): Promise<number> {
    const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
    const sizes = await Promise.all(entries.map(entry => {
        const full = path.join(folder, entry.name);
        return entry.isDirectory() ? folderBytes(full) : entry.isFile() ? stat(full).then(s => s.size) : 0;
    }));
    return sizes.reduce((sum, size) => sum + size, 0);
}

/** Bytes the band's folder of herd storage holds */
export async function herdStorageUsed(band: Band): Promise<number> {
    const known = usage.get(band.id);
    if (known && Date.now() - known.at < USAGE_MS) return known.bytes;
    const bytes = await folderBytes(path.join(filesRoot, band.herdFolder));
    usage.set(band.id, { bytes, at: Date.now() });
    return bytes;
}

export const forgetStorageUsed = (band: Band) => usage.delete(band.id);

/** The band's herd storage, used and allowed, in bytes (null: no limit) */
export async function herdStorage(band: Band): Promise<{ used: number, limit: number | null }> {
    const limit = quotaFor('storagePerBand', band);
    return { used: await herdStorageUsed(band), limit: limit === null ? null : limit * GB };
}

/** Refuses a file of `bytes` the band's herd storage can't take: too large, or over its space. Own WebDAV isn't counted */
export async function checkUpload(band: Band, bytes: number): Promise<void> {
    if (band.storage != BandStorage.HERD) return;
    const largest = quotaFor('largestFile', band);
    if (largest !== null && bytes > largest * MB) {
        error(413, `Files on this herd's storage can be ${formatLimit('largestFile', largest)} at most`);
    }
    const { used, limit } = await herdStorage(band);
    if (limit !== null && used + bytes > limit) {
        error(413, `${band.name}'s herd storage is full (${formatLimit('storagePerBand', quotaFor('storagePerBand', band))}). Make room, or ask the herd's admins for more`);
    }
}
