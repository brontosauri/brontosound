import { fail } from '@sveltejs/kit';
import { admitGuest, anyPublicSession, guestBand, liveBackline } from '$lib/server/backline/liveSession';
import { listMemberships } from '$lib/server/bands';
import { countLoginAttempt, MAX_LOGIN_ATTEMPTS } from '$lib/server/users';
import { GUEST_COOKIE } from './guestCookie';
import type { Actions, PageServerLoad } from './$types';

// Members see their band's live session (they pick one, with `?band=<handle>`, when several are live); visitors the
// one their guest token is for
export const load = (async ({ locals, cookies, url }) => {
    const memberships = locals.brontoSession ? await listMemberships(locals.brontoSession.user.id) : [];
    const liveBands = memberships.map(({ band }) => band).filter(band => liveBackline(band.id));
    const picked = liveBands.find(band => band.handle === url.searchParams.get('band')) ?? (liveBands.length == 1 ? liveBands[0] : null);
    const band = picked?.id ?? guestBand(cookies.get(GUEST_COOKIE));
    const live = band ? liveBackline(band) : null;
    return {
        band,
        // The remote, as the live Backline sent it
        page: live?.page ?? null,
        liveBands: live ? [] : liveBands.map(({ handle, name }) => ({ handle, name })),
        asksPin: !live && anyPublicSession(),
    };
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ request, cookies, getClientAddress }) => {
        const pin = String((await request.formData()).get('pin') ?? '');
        if (countLoginAttempt(`backline|${getClientAddress()}`) > MAX_LOGIN_ATTEMPTS) {
            return fail(429, { pinError: 'Too many attempts. Try again in 15 minutes.' });
        }
        const guest = admitGuest(pin);
        if (!guest) {
            return fail(400, { pinError: 'Wrong PIN' });
        }
        cookies.set(GUEST_COOKIE, guest.token, { path: '/backline', maxAge: 12 * 60 * 60 });
    },
} satisfies Actions;
