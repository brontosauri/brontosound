import { error, fail, isHttpError } from '@sveltejs/kit';
import { QUOTA_KEYS, QUOTAS, type Limits } from '$lib/quotas';
import { requireHerdAdmin } from '$lib/server/admin';
import { herdSettings } from '$lib/server/herdSettings';
import { text } from '$lib/server/input';
import { isQuotaKey, limitFromForm, listOverrides, removeOverride, saveDefaults, setOverride } from '$lib/server/quotaAdmin';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
    requireHerdAdmin(locals);
    return {
        pageTitle: "Quotas",
        breadcrumb: [{ title: "Quotas" }],
        defaults: herdSettings().quotas,
        overrides: await listOverrides(),
    };
}) satisfies PageServerLoad;

/** Runs an admin's change; its expected errors reach the page as a message */
async function asAdmin(locals: App.Locals, request: Request, change: (form: FormData, by: App.Locals['brontoSession'] & object) => Promise<unknown>) {
    const session = requireHerdAdmin(locals);
    const form = await request.formData();
    try {
        await change(form, session);
        return { saved: true };
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

function quotaKey(value: unknown) {
    if (!isQuotaKey(value)) error(400, 'No such quota');
    return value;
}

export const actions = {
    saveDefaults: async ({ request, locals }) => asAdmin(locals, request, async form => {
        await saveDefaults(Object.fromEntries(QUOTA_KEYS.map(key => [key, limitFromForm(form, key, QUOTAS[key].label)])) as Limits);
    }),
    addOverride: async ({ request, locals }) => asAdmin(locals, request, async (form, { user }) => {
        const key = quotaKey(form.get('key'));
        await setOverride(form.get('handle'), key, limitFromForm(form, 'limit', 'New limit'), text(form.get('reason') ?? '', 'why').trim(), user);
    }),
    removeOverride: async ({ request, locals }) => asAdmin(locals, request, async form => {
        const kind = form.get('kind') == 'user' ? 'user' : 'band';
        await removeOverride(kind, Number(form.get('id')), quotaKey(form.get('key')));
    }),
} satisfies Actions;
