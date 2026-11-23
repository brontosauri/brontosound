import { findStoredSong, listSongFolder } from "$lib/server/songFolder";
import type { SongFile } from "$lib/songFiles/songFile";
import { soundfontChoice } from "$lib/server/soundfonts";
import { requireBandPermission } from "$lib/server/session";
import type { PageServerLoad } from "./$types";

export const load = (async ({ params, locals }) => {
  const { user, band } = requireBandPermission(locals, 'songbook.read');
  const song = await findStoredSong(band, params.songId);

  // The page still opens when storage can't be read, and says so
  let rootFiles: SongFile[] = [];
  let folderError: string | null = null;
  try {
    rootFiles = await listSongFolder(band, song, '');
  } catch (e: any) {
    folderError = e?.body?.message ?? e?.message ?? String(e);
  }

  return {
    pageTitle: null, // the page renders its own title, with tags and actions
    rootFiles,
    folderError,
    soundfonts: await soundfontChoice(user),
  };
}) satisfies PageServerLoad;
