import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Band } from '$lib/dbEntities/band';
import { User } from '$lib/dbEntities/user';

// Users and bands share one namespace of handles: `/@lucia`, `/@the-ammonites` (later `@lucia@<herd>`)

const HANDLE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

/** A handle to claim: 2 to 30 lowercase letters, digits and hyphens, not starting or ending with one */
export function validHandle(value: unknown): string {
    const handle = typeof value == 'string' ? value.trim().toLowerCase().replace(/^@/, '') : '';
    if (!HANDLE.test(handle)) error(400, 'A handle has 2 to 30 letters, digits or hyphens, and starts and ends with a letter or digit');
    return handle;
}

/** Not a user's or band's, nor a login (`admin`): people sign in with their handle */
export async function isHandleFree(handle: string): Promise<boolean> {
    const db = await TypeOrm.getDb();
    return !await db.getRepository(User).existsBy([{ handle }, { username: handle }]) && !await db.getRepository(Band).existsBy({ handle });
}

// Claims run one at a time: the check and the save of two at once would both find a handle free. One process
// serves the herd, and SQLite transactions here share one connection, so they wouldn't keep claims apart
let claims: Promise<unknown> = Promise.resolve();

/** Runs `save` if `handle` is free (a 409 error otherwise), with no other claim in between */
export function claimHandle<T>(handle: string, save: () => Promise<T>): Promise<T> {
    const claim = claims.then(async () => {
        if (!await isHandleFree(handle)) error(409, `@${handle} is taken`);
        return save();
    });
    claims = claim.catch(() => {});
    return claim;
}
