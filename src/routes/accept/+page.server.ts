import { fail, isHttpError, redirect } from '@sveltejs/kit';
import { acceptTerms, termsCheckboxes } from '$lib/server/legal/acceptance';
import { herdSettings } from '$lib/server/herdSettings';
import { deleteOwnAccount } from '$lib/server/userAdmin';
import type { Actions, PageServerLoad } from './$types';

// After joining with Google, which asks for nothing: the Terms, before anything else (hooks.server.ts)
export const load = (async ({ locals }) => {
    if (!locals.brontoSession?.user.mustAcceptTerms) redirect(303, '/me');
    return { pageTitle: `Welcome to ${herdSettings().herdName}`, terms: termsCheckboxes() };
}) satisfies PageServerLoad;

/** Where they were going: a path on this site, else their profile */
const destination = (then: string | null) => then?.startsWith('/') && !then.startsWith('//') ? then : '/me';

export const actions = {
    accept: async ({ request, locals, url }) => {
        if (!locals.brontoSession) redirect(303, '/signin');
        try {
            await acceptTerms(locals.brontoSession.user, await request.formData());
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { error: e.body.message });
            throw e;
        }
        redirect(303, destination(url.searchParams.get('then')));
    },
    // Not accepting: the account Google created goes
    decline: async ({ locals }) => {
        if (locals.brontoSession?.user.mustAcceptTerms) await deleteOwnAccount(locals.brontoSession.user);
        redirect(303, '/');
    },
} satisfies Actions;
