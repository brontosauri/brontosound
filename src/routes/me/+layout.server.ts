import { redirect } from '@sveltejs/kit';
import { bandSummary, listMemberships } from '$lib/server/bands';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
    if (!locals.brontoSession) redirect(303, '/signin');
    return { bands: (await listMemberships(locals.brontoSession.user.id)).map(bandSummary) };
}) satisfies LayoutServerLoad;
