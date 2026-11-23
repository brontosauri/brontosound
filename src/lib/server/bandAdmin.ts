import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Band, BandRole, BandStorage, Membership } from '$lib/dbEntities/band';
import { endBandSession } from './backline/liveSession';
import { removeHerdFolder } from './bands';
import { claimHandle, validHandle } from './handles';
import { deletePicture } from './pictures';

// What herd admins see of bands, and do with them (/admin/bands): their metadata, never their content

export interface BandListItem {
    id: number;
    name: string;
    handle: string;
    owners: string[];
    memberCount: number;
    storage: BandStorage;
    suspended: boolean;
    creationDate: Date;
}

export async function listBands(): Promise<BandListItem[]> {
    const db = await TypeOrm.getDb();
    const [bands, memberships] = await Promise.all([
        db.getRepository(Band).find({ order: { name: 'ASC' } }),
        db.getRepository(Membership).find({ relations: { band: true, user: true } }),
    ]);
    return bands.map(band => {
        const members = memberships.filter(membership => membership.band.id === band.id);
        return {
            id: band.id, name: band.name, handle: band.handle, storage: band.storage,
            owners: members.filter(({ role }) => role === BandRole.OWNER).map(({ user }) => user.name),
            memberCount: members.length,
            suspended: !!band.suspendedDate,
            creationDate: band.creationDate,
        };
    });
}

export async function findBand(id: number): Promise<Band> {
    const band = await (await TypeOrm.getRepository(Band)).findOneBy({ id });
    if (!band) error(404, 'Band not found');
    return band;
}

/** Locks the band for its members, and ends its live session; nothing is deleted */
export async function suspendBand(id: number): Promise<void> {
    await findBand(id);
    await (await TypeOrm.getRepository(Band)).update(id, { suspendedDate: new Date() });
    endBandSession(id);
}

export async function restoreBand(id: number): Promise<void> {
    await findBand(id);
    await (await TypeOrm.getRepository(Band)).update(id, { suspendedDate: null });
}

/** A new handle for the band: the old one is free for others. Its herd storage folder stays where it is */
export async function renameBandHandle(id: number, handle: unknown): Promise<void> {
    await findBand(id);
    const newHandle = validHandle(handle);
    await claimHandle(newHandle, async () => (await TypeOrm.getRepository(Band)).update(id, { handle: newHandle }));
}

/** Deletes the band, all it has, and its herd storage folder, once `confirmation` is its handle. Its own WebDAV is left alone */
export async function deleteBand(id: number, confirmation: unknown): Promise<void> {
    const band = await findBand(id);
    if (confirmation !== band.handle) error(400, `Type the band's handle, ${band.handle}, to delete it`);
    await (await TypeOrm.getRepository(Band)).delete(id); // its rows go with it (onDelete: CASCADE)
    endBandSession(id);
    await removeHerdFolder(band);
    await deletePicture(band.logo);
}
