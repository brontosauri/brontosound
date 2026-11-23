import { error, fail } from '@sveltejs/kit';
import { confirmLink, isLinkRequest } from '$lib/server/backline/links';
import { isMember, listMemberships } from '$lib/server/bands';
import type { Actions, PageServerLoad } from './$types';

// Backline opens this page to be linked to whoever is signed in, for one of their bands (docs/backline.md)
export const load = (async ({ url, locals }) => {
    const request = url.searchParams.get('request');
    if (!isLinkRequest(request)) {
        error(400, 'Start linking from Backline: Settings → Sharing');
    }
    const memberships = locals.brontoSession ? await listMemberships(locals.brontoSession.user.id) : [];
    return {
        // Backline shows the same code: it tells the user this request is their own Backline's
        code: `${request.slice(0, 3)}-${request.slice(3, 6)}`.toUpperCase(),
        bands: memberships.map(({ band }) => ({ value: band.id, name: band.name })),
    };
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ url, locals, request: formRequest }) => {
        const request = url.searchParams.get('request');
        if (!locals.brontoSession || !isLinkRequest(request)) {
            error(403, 'Sign in first');
        }
        const band = Number((await formRequest.formData()).get('band'));
        if (!await isMember(locals.brontoSession.user.id, band)) {
            return fail(400, { bandError: 'Pick one of your bands' });
        }
        await confirmLink(request, locals.brontoSession.user.id, band);
        return { linked: true };
    },
} satisfies Actions;
