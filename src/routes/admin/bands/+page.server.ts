import { fail, isHttpError } from '@sveltejs/kit';
import { requireHerdAdmin } from '$lib/server/admin';
import { deleteBand, listBands, renameBandHandle, restoreBand, suspendBand } from '$lib/server/bandAdmin';
import { suspensionReason } from '$lib/server/suspensions';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
    requireHerdAdmin(locals);
    return {
        pageTitle: "Bands",
        breadcrumb: [{ title: "Bands" }],
        bands: await listBands(),
    };
}) satisfies PageServerLoad;

/** Runs an admin's change to band `band`; its expected errors reach the page as a message */
async function asAdmin(locals: App.Locals, request: Request, change: (form: FormData, id: number) => Promise<unknown>) {
    requireHerdAdmin(locals);
    const form = await request.formData();
    try {
        await change(form, Number(form.get('band')));
        return {};
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

export const actions = {
    suspend: async ({ request, locals }) => asAdmin(locals, request, (form, id) => suspendBand(id, suspensionReason(form.get('reason')))),
    restore: async ({ request, locals }) => asAdmin(locals, request, (_, id) => restoreBand(id)),
    rename: async ({ request, locals }) => asAdmin(locals, request, (form, id) => renameBandHandle(id, form.get('handle'))),
    delete: async ({ request, locals }) => asAdmin(locals, request, (form, id) => deleteBand(id, form.get('confirmation'))),
} satisfies Actions;
