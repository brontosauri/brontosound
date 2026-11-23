import { error, redirect, type Cookies } from '@sveltejs/kit';
import type { User } from '$lib/dbEntities/user';
import { isMember } from '$lib/server/bands';
import { findLink, joinWithLink, joiningBand } from '$lib/server/inviteLinks';
import { INVITE_COOKIE, mayJoin } from '$lib/server/registration';
import type { Actions, PageServerLoad } from './$types';

// A band's invite link: open to visitors, who sign up or in first (registration.ts, INVITE_COOKIE); back here,
// signed in, they join
export const load = (async ({ params, locals, cookies }) => {
    const found = await findLink(params.token);
    if (!found || found.end) return { closed: { reason: found?.end ?? null, bandName: found?.link.band.name ?? null } };
    const user = locals.brontoSession?.user;
    const member = !!user && await isMember(user.id, found.link.band.id);
    if (user && !member && cameBackToJoin(cookies, params.token)) await joinAndGo(params.token, user);
    return {
        joining: joiningBand(found.link), // not `band`: the header would show it
        member,
        mayJoin: !user && await mayJoin(params.token),
    };
}) satisfies PageServerLoad;

/** Whether the user signed up or in from this link just now: its cookie, used once */
function cameBackToJoin(cookies: Cookies, token: string): boolean {
    if (cookies.get(INVITE_COOKIE) !== token) return false;
    cookies.delete(INVITE_COOKIE, { path: '/' });
    return true;
}

async function joinAndGo(token: string, user: User): Promise<never> {
    const band = await joinWithLink(token, user);
    redirect(303, `/me?joined=${band.handle}`);
}

export const actions = {
    default: async ({ params, locals }) => {
        if (!locals.brontoSession) error(403, 'Sign in first');
        await joinAndGo(params.token, locals.brontoSession.user);
    },
} satisfies Actions;
