import { fail, isHttpError } from '@sveltejs/kit';
import { LegalDocument } from '$lib/dbEntities/legal';
import { LEGAL_TITLES } from '$lib/legal';
import { requireHerdAdmin } from '$lib/server/admin';
import { saveHerdSettings } from '$lib/server/herdSettings';
import { herdSettingEntries } from '$lib/server/herdSettingEntries';
import { settingsFromForm } from '$lib/server/settingsForm';
import { oneOf, text } from '$lib/server/input';
import { checkDraft, discardDraft, findDraft, NOTICE_DAYS, publishDraft, publishedVersions, saveDraft, templateText, type Announcement, type DraftInput } from '$lib/server/legal/documents';
import { recipientCount } from '$lib/server/legal/announce';
import type { Actions, PageServerLoad } from './$types';

async function documentView(document: LegalDocument) {
    const [draft, published] = await Promise.all([findDraft(document), publishedVersions(document)]);
    return {
        document,
        title: LEGAL_TITLES[document],
        published: published.map(({ effectiveDate }) => effectiveDate),
        draft: draft ? { text: draft.text, changelog: draft.changelog, effectiveDate: draft.effectiveDate }
            : { text: published[0]?.text ?? templateText(document), changelog: '', effectiveDate: daysFromNow(published.length ? NOTICE_DAYS : 0) },
        hasDraft: !!draft,
    };
}

/** Herd settings the Terms ask at sign-up */
function settings() {
    const { text, number } = herdSettingEntries();
    return [
        number("Minimum age", "minimumAge"),
        text("Second sign-up checkbox", "signUpConsent", "People must tick it too. For clauses your law asks them to approve on their own."),
    ];
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export const load = (async ({ locals }) => {
    requireHerdAdmin(locals);
    return {
        pageTitle: "Legal texts",
        breadcrumb: [{ title: "Legal texts" }],
        settings: settings(),
        documents: await Promise.all(Object.values(LegalDocument).map(documentView)),
        noticeDays: NOTICE_DAYS,
        recipients: await recipientCount(),
    };
}) satisfies PageServerLoad;

const documentOf = (form: FormData) => oneOf(form.get('document'), LegalDocument, 'document');

const announcement = (form: FormData): Announcement => ({
    banner: form.has('banner'),
    email: form.has('email') ? text(form.get('emailText') ?? '', 'email').trim() : null,
});

const draftInput = (form: FormData): DraftInput => ({
    text: text(form.get('text') ?? '', 'text'),
    changelog: text(form.get('changelog') ?? '', 'changelog').trim(),
    effectiveDate: text(form.get('effectiveDate') ?? '', 'effective date'),
});

/** Runs an admin's change; its expected errors (a date refused) reach the page */
async function change(locals: App.Locals, request: Request, run: (form: FormData) => Promise<void>) {
    requireHerdAdmin(locals);
    try {
        await run(await request.formData());
        return {};
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

export const actions = {
    saveSettings: ({ locals, request }) => change(locals, request, form => saveHerdSettings(settingsFromForm(settings(), form))),
    saveDraft: ({ locals, request }) => change(locals, request, form => saveDraft(documentOf(form), draftInput(form))),
    fillFromTemplate: ({ locals, request }) => change(locals, request, form =>
        saveDraft(documentOf(form), { ...draftInput(form), text: templateText(documentOf(form)) })),
    // Before asking how to announce a change: saves the draft, and refuses one that can't be published
    review: ({ locals, request }) => change(locals, request, async form => {
        await saveDraft(documentOf(form), draftInput(form));
        await checkDraft(documentOf(form));
    }),
    publish: ({ locals, request }) => change(locals, request, async form => {
        await saveDraft(documentOf(form), draftInput(form));
        await publishDraft(documentOf(form), announcement(form));
    }),
    discardDraft: ({ locals, request }) => change(locals, request, form => discardDraft(documentOf(form))),
} satisfies Actions;
