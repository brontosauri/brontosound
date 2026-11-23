import { IsNull } from 'typeorm';
import TypeOrm from '$lib/db';
import { Band } from '$lib/dbEntities/band';
import { User, Visibility } from '$lib/dbEntities/user';
import { herdSettings } from '$lib/server/herdSettings';
import type { PageServerLoad } from './$types';

const BANDS_SHOWN = 8;

// The herd's home page: what it is, how to join, and its public bands
export const load = (async () => {
    const db = await TypeOrm.getDb();
    const [publicBands, bandCount, peopleCount] = await Promise.all([
        db.getRepository(Band).find({ where: { visibility: Visibility.PUBLIC, suspendedDate: IsNull() }, order: { name: 'ASC' } }),
        db.getRepository(Band).countBy({ suspendedDate: IsNull() }),
        db.getRepository(User).countBy({ removedDate: IsNull(), suspendedDate: IsNull() }),
    ]);
    const { tagline, registrations, contactEmail } = herdSettings();
    return {
        tagline, registrations, contactEmail, bandCount,
        peopleCount: peopleCount - 1, // not the built-in admin
        bands: publicBands.slice(0, BANDS_SHOWN).map(({ name, handle, logo }) => ({ name, handle, logo })),
        moreBands: Math.max(0, publicBands.length - BANDS_SHOWN),
    };
}) satisfies PageServerLoad;
