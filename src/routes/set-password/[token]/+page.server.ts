import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import { findPasswordLink, setPasswordWithLink } from '$lib/server/passwordLinks';
import { loginOf } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

// A link a herd admin handed out: open to visitors
export const load = (async ({ params }) => {
    const link = await findPasswordLink(params.token);
    if (!link) error(404, 'This link has expired, or was used already');
    return { name: link.user.name, login: loginOf(link.user) };
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ params, request }) => {
        const form = await request.formData();
        const password = String(form.get('password') ?? '');
        if (password !== form.get('repeat')) return fail(400, { error: "The passwords don't match" });
        try {
            await setPasswordWithLink(params.token, password);
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { error: e.body.message });
            throw e;
        }
        redirect(303, '/signin?passwordChanged');
    },
} satisfies Actions;
