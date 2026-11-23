import { env } from '$env/dynamic/private';
import { error, fail, isHttpError } from '@sveltejs/kit';
import { BandRole } from '$lib/dbEntities/band';
import { listMemberships } from '$lib/server/bands';
import { oneOf } from '$lib/server/input';
import { inviteUser } from '$lib/server/members';
import { findProfile } from '$lib/server/publicProfiles';
import { reportProfile } from '$lib/server/reports';
import type { Actions, PageServerLoad } from './$types';

// A band's or a person's public profile: open to visitors, as its owner chose
export const load = (async ({ params, locals, url }) => {
    const profile = await findProfile(params.handle, locals.brontoSession?.user ?? null);
    if (!profile) error(404, 'Not found');
    return {
        profile,
        herdDomain: new URL(env.ORIGIN || url.origin).host, // handles end with it: @lucia@herd.example
    };
}) satisfies PageServerLoad;

/** Runs a signed-in visitor's request; its expected errors reach the page as a message */
async function signedIn(locals: App.Locals, change: (user: NonNullable<App.Locals['brontoSession']>['user']) => Promise<object>) {
    if (!locals.brontoSession) error(403, 'Sign in first');
    try {
        return await change(locals.brontoSession.user);
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

export const actions = {
    // An owner invites this person to one of their bands
    invite: async ({ request, locals, params }) => signedIn(locals, async user => {
        const form = await request.formData();
        const membership = (await listMemberships(user.id)).find(({ band, role }) => band.id === Number(form.get('band')) && role == BandRole.OWNER);
        if (!membership) error(403, 'Only owners invite people to their band');
        return { invited: await inviteUser(membership.band, oneOf(form.get('role'), BandRole, 'role'), user, params.handle) };
    }),
    report: async ({ request, locals, params }) => signedIn(locals, async user => {
        await reportProfile(params.handle, (await request.formData()).get('reason'), user);
        return { reported: true };
    }),
} satisfies Actions;
