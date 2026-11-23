import { fail, isHttpError, redirect } from '@sveltejs/kit';
import { herdSettings } from '$lib/server/herdSettings';
import { joiningBand } from '$lib/server/inviteLinks';
import { mayJoin, register, rememberInvite } from '$lib/server/registration';
import { sendEmailConfirmation } from '$lib/server/emailLinks';
import type { Actions, PageServerLoad } from './$types';

// Joining the herd: open to visitors, as registrations allow. `?invite=<token>`: with a band's invite link
export const load = (async ({ url, cookies, locals }) => {
    if (locals.brontoSession) redirect(303, '/me');
    const token = url.searchParams.get('invite');
    const link = await rememberInvite(cookies, token);
    const { registrations, rules, contactEmail, googleSignUp } = herdSettings();
    return {
        pageTitle: `Join ${herdSettings().herdName}`,
        mayJoin: await mayJoin(token),
        registrations,
        joining: link && joiningBand(link),
        rules,
        contactEmail,
        googleSignUp,
    };
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ request, url }) => {
        const form = await request.formData();
        const token = url.searchParams.get('invite');
        let user;
        try {
            if (herdSettings().rules.length && !form.has('rules')) return fail(400, { error: "Read the herd's rules first" });
            user = await register({ name: form.get('name'), handle: form.get('handle'), email: form.get('email'), password: form.get('password') }, token);
            if (user.unconfirmedEmail) await sendEmailConfirmation(user, url.origin);
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { error: e.body.message });
            throw e;
        }
        redirect(303, `/signin?${user.unconfirmedEmail ? 'confirm' : 'joined'}${token ? `&invite=${token}` : ''}`);
    },
} satisfies Actions;
