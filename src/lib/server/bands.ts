import { rm } from 'fs/promises';
import path from 'path';
import TypeOrm from '$lib/db';
import { Band, BandRole, BandStorage, Membership, type BandSummary } from '$lib/dbEntities/band';
import type { User } from '$lib/dbEntities/user';
import { filesRoot } from './config';
import { claimHandle } from './handles';
import { herdSettings } from './herdSettings';
import { checkCanCreateBand } from './quotas';
import { assertInside, FilesystemStorage, WebdavStorage, type PersistedStorage } from './storage';

/** A new band on herd storage, its creator its owner, within the bands they may create */
export async function createBand({ name, handle }: { name: string, handle: string }, creator: User): Promise<Band> {
    await checkCanCreateBand(creator);
    const band = await claimHandle(handle, async () => (await TypeOrm.getDb()).transaction(async manager => {
        const band = await manager.save(manager.create(Band, {
            name, handle,
            storage: BandStorage.HERD,
            herdFolder: `${herdSettings().herdStorageFolder}/${handle}`,
            createdBy: { id: creator.id },
        }));
        await manager.insert(Membership, { band: { id: band.id }, user: { id: creator.id }, role: BandRole.OWNER });
        return band;
    }));
    await (await bandStorage(band)).createDirectory(band.herdFolder);
    return band;
}

/** The user's membership of the band at `handle`, with the band: null if there's no such band, or they aren't in it */
export async function findMembership(handle: string, userId: number): Promise<Membership | null> {
    return (await TypeOrm.getRepository(Membership)).findOne({
        where: { band: { handle }, user: { id: userId } },
        relations: { band: true },
    });
}

/** The bands the user is in, with their role, by band name */
export async function listMemberships(userId: number): Promise<Membership[]> {
    return (await TypeOrm.getRepository(Membership)).find({
        where: { user: { id: userId } },
        relations: { band: true },
        order: { band: { name: 'ASC' } },
    });
}

export async function isMember(userId: number, bandId: number): Promise<boolean> {
    return (await TypeOrm.getRepository(Membership)).existsBy({ user: { id: userId }, band: { id: bandId } });
}

/** Where the band's songs are: its folder in herd storage, or the songs folder on its own WebDAV server */
export function songsFolderOf(band: Band): string {
    return band.storage == BandStorage.WEBDAV ? band.webdavSongsFolder ?? '' : band.herdFolder;
}

/** The band's file storage. Paths start with its songs folder, and can't leave it */
export async function bandStorage(band: Band): Promise<PersistedStorage> {
    if (band.storage == BandStorage.WEBDAV) {
        const { webdavPassword } = await (await TypeOrm.getRepository(Band)).createQueryBuilder('band')
            .addSelect('band.webdavPassword')
            .where('band.id = :id', { id: band.id })
            .getOneOrFail();
        return new WebdavStorage(band.webdavServer ?? '', band.webdavUsername ?? '', webdavPassword ?? '',
            songsFolderOf(band), herdSettings().webdavConcurrentConnections);
    }
    return new FilesystemStorage(filesRoot, band.herdFolder);
}

export function bandSummary({ band, role }: Membership): BandSummary {
    return { id: band.id, handle: band.handle, name: band.name, logo: band.logo, role };
}

/** Empties and removes the band's folder of herd storage */
export async function removeHerdFolder(band: Band): Promise<void> {
    const root = path.resolve(filesRoot), folder = path.resolve(root, band.herdFolder);
    assertInside(root, folder, path);
    if (folder !== root) {
        await rm(folder, { recursive: true, force: true });
    }
}
