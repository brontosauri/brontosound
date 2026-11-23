import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Band, BandStorage } from '$lib/dbEntities/band';
import { Visibility } from '$lib/dbEntities/user';
import { pathJoin } from '$lib/misc';
import { forgetStorageUsed } from './quotas';
import { herdSettings } from './herdSettings';
import { oneOf, text } from './input';
import { checkServerAddress } from './publicAddress';
import { savePicture } from './pictures';
import { FileNotFoundError, isFolderName, WebdavStorage } from './storage';

// What owners change of their band (Band › Settings): its name, and where its songs are

export async function renameBand(band: Band, name: unknown): Promise<void> {
    const newName = text(name, 'name').trim();
    if (!newName || newName.length > 100) error(400, 'The band needs a name, up to 100 characters');
    await (await TypeOrm.getRepository(Band)).update(band.id, { name: newName });
}

/** What the herd and the web see at /@handle, from the profile form, field by field */
export async function saveBandProfile(band: Band, form: FormData): Promise<void> {
    const field = (name: string, max = 100) => {
        const value = text(form.get(name) ?? '', name).trim();
        if (value.length > max) error(400, `"${name}" can be ${max} characters at most`);
        return value;
    };
    const publicEmail = field('publicEmail');
    if (publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)) error(400, `Not an email address: ${publicEmail}`);
    const links = field('links', 2000).split('\n').map(link => link.trim()).filter(Boolean).slice(0, 10);
    const notLink = links.find(link => !/^https?:\/\/[^/]/i.test(link));
    if (notLink) error(400, `Links start with https://: ${notLink}`);
    await (await TypeOrm.getRepository(Band)).update(band.id, {
        visibility: oneOf(form.get('visibility'), Visibility, 'visibility'),
        about: field('about', 2000), genres: field('genres'), city: field('city'), publicEmail, links,
        showGigs: form.has('showGigs'), showMembers: form.has('showMembers'),
    });
}

/** A dark logo on a transparent background: the header shows it white */
export async function saveLogo(band: Band, file: unknown): Promise<void> {
    const logo = await savePicture(file, band.logo);
    await (await TypeOrm.getRepository(Band)).update(band.id, { logo });
}

interface WebdavSettings {
    webdavServer: string;
    webdavUsername: string;
    webdavPassword: string;
    webdavSongsFolder: string;
}

/** The WebDAV settings an owner sent, checked; a password left blank is the saved one */
async function webdavFromForm(band: Band, form: FormData): Promise<WebdavSettings> {
    const webdavServer = text(form.get('webdavServer') ?? '', 'server').trim();
    const webdavSongsFolder = text(form.get('webdavSongsFolder') ?? '', 'songs folder').trim().replace(/^\/+|\/+$/g, '');
    if (!webdavSongsFolder.split('/').every(isFolderName)) error(400, 'The songs folder is a path of folder names, like "Band/Songs"');
    await checkServerAddress(webdavServer, herdSettings().webdavLocalServers);
    const typed = text(form.get('webdavPassword') ?? '', 'password');
    return {
        webdavServer, webdavSongsFolder,
        webdavUsername: text(form.get('webdavUsername') ?? '', 'username').trim(),
        webdavPassword: typed || await savedPassword(band),
    };
}

async function savedPassword(band: Band): Promise<string> {
    const saved = await (await TypeOrm.getRepository(Band)).createQueryBuilder('band')
        .addSelect('band.webdavPassword').where('band.id = :id', { id: band.id }).getOneOrFail();
    return saved.webdavPassword ?? '';
}

/** Moves the band's songs to herd storage or its own WebDAV. Files aren't moved: owners copy them first */
export async function saveBandStorage(band: Band, form: FormData): Promise<void> {
    const storage = oneOf(form.get('storage'), BandStorage, 'storage');
    if (storage == BandStorage.WEBDAV && band.storage != BandStorage.WEBDAV && !herdSettings().webdavAllowed) {
        error(403, "This herd's admins haven't enabled WebDAV for bands");
    }
    const changes = storage == BandStorage.WEBDAV ? await webdavFromForm(band, form) : {};
    await (await TypeOrm.getRepository(Band)).update(band.id, { storage, ...changes });
    forgetStorageUsed(band);
}

export interface StorageTest {
    read: string | null; // what went wrong, or null
    write: string | null;
}

const TEST_FILE = 'brontosound-connection-test.tmp';

/** Lists the songs folder of the WebDAV server in the form, then writes and deletes a file in it */
export async function testWebdav(band: Band, form: FormData): Promise<StorageTest> {
    const settings = await webdavFromForm(band, form);
    const storage = new WebdavStorage(settings.webdavServer, settings.webdavUsername, settings.webdavPassword,
        settings.webdavSongsFolder, herdSettings().webdavConcurrentConnections);
    const attempt = async (check: () => Promise<unknown>) => check().then(() => null, problemOf);
    return {
        read: await attempt(() => storage.listFolder(settings.webdavSongsFolder)),
        write: await attempt(async () => {
            const file = pathJoin(settings.webdavSongsFolder, TEST_FILE);
            await storage.writeTextFile('Temporary file created by Brontosound to test the connection. Safe to delete.', file);
            await storage.deleteFile(file);
        }),
    };
}

/** What went wrong, for the owner: never the server's own reply, which may come from anywhere the address points */
function problemOf(e: unknown): string {
    if (e instanceof FileNotFoundError) return "There's no such songs folder on the server";
    const status = String((e as Error)?.message).match(/\b(401|403|404|405|507)\b/)?.[1];
    return status == '401' || status == '403' ? 'The server refused the username or password'
        : status == '404' ? "There's no such folder on the server"
        : status == '507' ? 'The server is full'
        : "Couldn't reach a WebDAV server at this address";
}
