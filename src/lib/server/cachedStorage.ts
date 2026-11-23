import TypeOrm from "$lib/db";
import type { Band } from "$lib/dbEntities/band";
import { SongFolder } from "$lib/dbEntities/song";
import { bandStorage, songsFolderOf } from "./bands";

/** Lists the band's songs folder (creating it if missing) and keeps the listing, which the Songbook matches songs against */
export async function syncSongsFolder(band: Band): Promise<SongFolder[]> {
    const songsFolder = songsFolderOf(band);
    const storage = await bandStorage(band);
    await storage.createDirectory(songsFolder);
    const syncDate = new Date();
    const folders = (await storage.listFolder(songsFolder))
        .filter(entry => entry.isFolder)
        .map(entry => Object.assign(new SongFolder(), { name: entry.name, syncDate, band: { id: band.id } }));

    return (await TypeOrm.getDb()).transaction(async manager => {
        await manager.delete(SongFolder, { band: { id: band.id } });
        return manager.save(folders);
    });
}
