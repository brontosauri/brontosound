import { PassThrough, Readable } from 'node:stream';
import { ZipArchive } from 'archiver';
import TypeOrm from '$lib/db';
import { BandStorage, Membership, type Band } from '$lib/dbEntities/band';
import { Contact } from '$lib/dbEntities/contacts';
import { LiveGig, LiveVenue } from '$lib/dbEntities/live';
import { Song } from '$lib/dbEntities/song';
import { filesRoot } from './config';
import { FilesystemStorage } from './storage';

// "Export band" (owners): a ZIP of the band, its own backup. band.json holds its records; songs/ its files, when
// they're on herd storage. A band's own WebDAV keeps its files itself: JSON only

/** The ZIP, streamed as it's made */
export async function bandExport(band: Band): Promise<ReadableStream> {
    const zip = new ZipArchive({ zlib: { level: 6 } });
    const output = new PassThrough();
    zip.on('error', e => output.destroy(e));
    zip.pipe(output);
    zip.append(JSON.stringify(await bandRecords(band), null, 2), { name: 'band.json' });
    if (band.storage == BandStorage.HERD) {
        zip.directory(new FilesystemStorage(filesRoot, band.herdFolder).root, 'songs');
    }
    void zip.finalize();
    return Readable.toWeb(output) as ReadableStream;
}

async function bandRecords(band: Band) {
    const db = await TypeOrm.getDb();
    const ofBand = { band: { id: band.id } };
    const [members, songs, venues, gigs, contacts] = await Promise.all([
        db.getRepository(Membership).find({ where: ofBand, relations: { user: true } }),
        db.getRepository(Song).find({ where: { ...ofBand, deleted: false }, relations: { tags: true } }),
        db.getRepository(LiveVenue).find({ where: ofBand }),
        db.getRepository(LiveGig).find({ where: ofBand, relations: { venue: true, interactions: true } }),
        db.getRepository(Contact).find({ where: ofBand }),
    ]);
    return {
        band: {
            name: band.name, handle: band.handle, about: band.about, genres: band.genres, city: band.city,
            publicEmail: band.publicEmail, links: band.links, visibility: band.visibility, created: band.creationDate,
        },
        songFiles: band.storage == BandStorage.HERD ? 'In songs/' : "On the band's own WebDAV server: not in this export",
        members: members.map(({ user, role, joinedDate }) => ({ name: user.name, handle: user.handle, role, joined: joinedDate })),
        songs: songs.map(({ title, artist, storedDirName, tags, creationDate }) =>
            ({ title, artist, folder: storedDirName, tags: tags.map(({ name }) => name), added: creationDate })),
        venues: venues.map(({ name, note, location, links }) => ({
            name, note, address: location?.formattedAddress, latitude: location?.latitude, longitude: location?.longitude,
            links: (links ?? []).map(({ type, customLabel, value, note }) => ({ type, label: customLabel, value, note })),
        })),
        gigs: gigs.map(({ name, status, date, venue, note, proposedCachet, agreedCachet, ReceivedCachet, interactions }) => ({
            name, status, date, venue: venue?.name, note, proposedCachet, agreedCachet, receivedCachet: ReceivedCachet,
            interactions: (interactions ?? []).map(({ date, note }) => ({ date, note })),
        })),
        contacts: contacts.map(({ name, email, phone, note }) => ({ name, email, phone, note })),
    };
}
