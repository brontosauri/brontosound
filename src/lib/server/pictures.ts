import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Picture } from '$lib/dbEntities/picture';

// Avatars and band logos: PNG, JPEG or WebP, told apart by their bytes, never SVG (which can carry scripts)

export const MAX_PICTURE_BYTES = 500 * 1024;

const SIGNATURES: { mime: string, matches: (bytes: Uint8Array) => boolean }[] = [
    { mime: 'image/png', matches: bytes => [0x89, 0x50, 0x4e, 0x47].every((byte, i) => bytes[i] === byte) },
    { mime: 'image/jpeg', matches: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
    { mime: 'image/webp', matches: bytes => String.fromCharCode(...bytes.slice(0, 4)) == 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) == 'WEBP' },
];

/** Keeps an uploaded picture, replacing the one at `previousUrl` if it was ours. Returns its URL */
export async function savePicture(file: unknown, previousUrl: string | null): Promise<string> {
    if (!(file instanceof File) || file.size == 0) error(400, 'Choose a picture');
    if (file.size > MAX_PICTURE_BYTES) error(413, 'Pictures can be 500 KB at most');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = SIGNATURES.find(signature => signature.matches(bytes))?.mime;
    if (!mime) error(400, 'Pictures are PNG, JPEG or WebP');
    const pictures = await TypeOrm.getRepository(Picture);
    const { id } = await pictures.save(pictures.create({ data: Buffer.from(bytes), mime }));
    await deletePicture(previousUrl);
    return `/pictures/${id}`;
}

export async function deletePicture(url: string | null): Promise<void> {
    const id = url?.match(/^\/pictures\/([0-9a-f-]{36})$/)?.[1];
    if (id) await (await TypeOrm.getRepository(Picture)).delete(id);
}

export async function findPicture(id: string): Promise<Picture | null> {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    return (await TypeOrm.getRepository(Picture)).createQueryBuilder('picture').addSelect('picture.data').where('picture.id = :id', { id }).getOne();
}
