import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import { herdSettings } from '$lib/server/herdSettings';
import { findHerdInvite } from '$lib/server/herdInvites';
import { acceptHerdInvite } from '$lib/server/registration';
import { termsAcceptance, termsCheckboxes } from '$lib/server/legal/acceptance';
import type { Actions, PageServerLoad } from './$types';

// A herd admin's invitation: open to visitors, whatever the herd's registrations
export const load = (async ({ params, locals }) => {
    const invite = await findHerdInvite(params.token);
    if (!invite) error(404, 'This invitation has expired, or was used already');
    return {
        pageTitle: `Welcome to ${herdSettings().herdName}`,
        email: invite.email,
        signedIn: !!locals.brontoSession,
        terms: termsCheckboxes(),
    };
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ params, request }) => {
        const form = await request.formData();
        try {
            const acceptance = await termsAcceptance(form);
            await acceptHerdInvite(params.token, { name: form.get('name'), handle: form.get('handle'), password: form.get('password'), ...acceptance });
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { error: e.body.message });
            throw e;
        }
        redirect(303, '/signin?joined&redirectTo=%2Fme');
    },
} satisfies Actions;
