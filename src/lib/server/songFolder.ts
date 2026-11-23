import { error } from '@sveltejs/kit';

import TypeOrm from '$lib/db';
import type { Band } from '$lib/dbEntities/band';
import { Song } from '$lib/dbEntities/song';
import { StoredSong } from '$lib/songbook';
import { joinPath, type SongFile } from '$lib/songFiles/songFile';
import { bandStorage, songsFolderOf } from './bands';
import { checkUpload, forgetStorageUsed } from './quotas';
import { isValidId } from './session';
import { FileNotFoundError, type FileStream } from './storage';

/** The band's song with id `songIdParam` (a route param), or a 400/404 error */
export async function findStoredSong(band: Band, songIdParam: string | undefined): Promise<StoredSong> {
    if (!songIdParam || !isValidId(songIdParam)) error(400, "Invalid songId");

    const songs = (await TypeOrm.getDb()).getRepository(Song);
    const song = await songs.findOne({ where: { id: parseInt(songIdParam), band: { id: band.id } }, relations: { tags: true } });
    if (!song) error(404, "Song not found!");

    return new StoredSong(song, songsFolderOf(band));
}

/** The content of a folder in the song's folder ("" is the song folder): folders first, then files, by name */
export async function listSongFolder(band: Band, song: StoredSong, folderPath: string): Promise<SongFile[]> {
    const storage = await bandStorage(band);
    const entries = await notFoundAs404(storage.listFolder(storagePath(song, folderPath)));
    return entries
        .map(entry => ({ ...entry, path: joinPath(folderPath, entry.name) }))
        .sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function readSongFile(band: Band, song: StoredSong, filePath: string): Promise<FileStream> {
    const storage = await bandStorage(band);
    return notFoundAs404(storage.readFileStream(storagePath(song, filePath)));
}

/** Write a file of the song folder. Without `replace`, an existing file is a 409 error. */
export async function writeSongFile(band: Band, song: StoredSong, filePath: string, data: Uint8Array, replace: boolean): Promise<void> {
    const storage = await bandStorage(band);
    const target = storagePath(song, filePath);
    if (!replace && await storage.fileExists(target)) error(409, `There's already a file called ${filePath.split('/').pop()} here`);
    await checkUpload(band, data.byteLength);
    await storage.writeFile(target, data);
    forgetStorageUsed(band);
}

export async function deleteSongFile(band: Band, song: StoredSong, filePath: string): Promise<void> {
    const storage = await bandStorage(band);
    await notFoundAs404(storage.deleteFile(storagePath(song, filePath)));
    forgetStorageUsed(band);
}

/** The storage path of a path relative to the song folder, which must stay inside it */
function storagePath(song: StoredSong, relativePath: string): string {
    if (relativePath.split(/[/\\]/).some(segment => segment == '..')) error(400, "Invalid path");
    return song.buildPath(relativePath);
}

async function notFoundAs404<T>(promise: Promise<T>): Promise<T> {
    try {
        return await promise;
    } catch (e) {
        if (e instanceof FileNotFoundError) error(404, `Not found in the song folder: ${e.message}`);
        throw e;
    }
}
