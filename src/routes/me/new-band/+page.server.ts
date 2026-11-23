import { fail, isHttpError, redirect } from '@sveltejs/kit';
import { bandAppUrl } from '$lib/misc';
import { createBand } from '$lib/server/bands';
import { validHandle } from '$lib/server/handles';
import { text } from '$lib/server/input';
import type { Actions, PageServerLoad } from './$types';

export const load = (() => ({
    pageTitle: "Create a band",
    breadcrumb: [{ title: "Create a band" }],
})) satisfies PageServerLoad;

export const actions = {
    default: async ({ request, locals }) => {
        const form = await request.formData();
        const name = String(form.get('name') ?? '').trim();
        let band;
        try {
            if (!name) return fail(400, { error: 'The band needs a name' });
            band = await createBand({ name: text(name, 'name'), handle: validHandle(form.get('handle')) }, locals.brontoSession!.user);
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { error: e.body.message });
            throw e;
        }
        redirect(303, bandAppUrl(band.handle));
    },
} satisfies Actions;
