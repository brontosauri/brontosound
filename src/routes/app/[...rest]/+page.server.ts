import { redirect } from '@sveltejs/kit';
import { bandAppUrl } from '$lib/misc';
import { listMemberships } from '$lib/server/bands';
import type { PageServerLoad } from './$types';

// Where sign-in lands, and the addresses of before bands: your band's pages if you're in one, else your profile
export const load = (async ({ locals, params }) => {
    if (!locals.brontoSession) redirect(303, '/signin');
    const memberships = await listMemberships(locals.brontoSession.user.id);
    redirect(303, memberships.length == 1 ? bandAppUrl(memberships[0].band.handle, params.rest ? `/${params.rest}` : '') : '/me');
}) satisfies PageServerLoad;
