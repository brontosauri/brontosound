import { error } from '@sveltejs/kit';
import { IsNull, MoreThan, Not } from 'typeorm';
import TypeOrm from '$lib/db';
import { LegalDocument, LegalVersion } from '$lib/dbEntities/legal';
import { changeSubject, LEGAL_TITLES, type LegalChange } from '$lib/legal';
import { herdSettings } from '../herdSettings';
import { emailReady } from '../mail';
import { emailEveryone } from './announce';
import { legalValues } from './legalValues';
import { fillTemplate, unfilled } from './template';
import terms from './terms.md?raw';
import privacy from './privacy.md?raw';

// The herd's Terms and Privacy Policy, versioned like Mastodon's terms: admins edit a draft, filled from the template
// if they like, and publish it with an effective date. Until a herd publishes one, the template shows

/** Notice people normally get of a change to a text they had, as the templates say */
export const NOTICE_DAYS = 30;

const TEMPLATES: Record<LegalDocument, string> = { [LegalDocument.TERMS]: terms, [LegalDocument.PRIVACY]: privacy };

const versions = () => TypeOrm.getRepository(LegalVersion);
const today = () => new Date().toISOString().slice(0, 10);

const herdValues = () => legalValues(herdSettings());

/** The template, filled from today's herd settings */
export function templateText(document: LegalDocument): string {
    return fillTemplate(TEMPLATES[document], herdValues());
}

/** Newest first */
export async function publishedVersions(document: LegalDocument): Promise<LegalVersion[]> {
    return (await versions()).find({ where: { document, publishedDate: Not(IsNull()) }, order: { effectiveDate: 'DESC' } });
}

const inForce = (published: LegalVersion[]) => published.find(version => version.effectiveDate <= today());
const upcoming = (published: LegalVersion[]) => published.filter(version => version.effectiveDate > today()).at(-1);

/** What /<document> shows: the version of `date`; else the one in force, else the next one, else the template */
export async function legalPage(document: LegalDocument, date?: string) {
    const published = await publishedVersions(document);
    const shown = date ? published.find(version => version.effectiveDate === date) : inForce(published) ?? upcoming(published);
    if (date && !shown) error(404, 'No version of that date');
    const next = upcoming(published);
    return {
        title: LEGAL_TITLES[document],
        text: shown?.text ?? templateText(document),
        effectiveDate: shown?.effectiveDate ?? null,
        changelog: shown?.changelog ?? '',
        inForce: !!shown && shown === inForce(published),
        upcoming: next && next !== shown ? next.effectiveDate : null,
        versions: published.map(({ effectiveDate }) => effectiveDate),
    };
}

/** The Terms people accept now: the version in force's date. Null while the template shows */
export async function termsVersion(): Promise<string | null> {
    return inForce(await publishedVersions(LegalDocument.TERMS))?.effectiveDate ?? null;
}

/** Published versions not yet in force, for the banner signed-in people see */
export async function upcomingChanges(): Promise<LegalChange[]> {
    return (await (await versions()).find({ where: { publishedDate: Not(IsNull()), effectiveDate: MoreThan(today()), banner: true }, order: { effectiveDate: 'ASC' } }))
        .map(({ document, effectiveDate }) => ({ document, effectiveDate }));
}

export async function findDraft(document: LegalDocument): Promise<LegalVersion | null> {
    return (await versions()).findOneBy({ document, publishedDate: IsNull() });
}

export interface DraftInput { text: string, changelog: string, effectiveDate: string }

export async function saveDraft(document: LegalDocument, input: DraftInput): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate) || isNaN(Date.parse(input.effectiveDate))) error(400, 'Pick the date it takes effect');
    const draft = await findDraft(document);
    await (await versions()).save({ ...draft, document, ...input, publishedDate: null });
}

export async function discardDraft(document: LegalDocument): Promise<void> {
    await (await versions()).delete({ document, publishedDate: IsNull() });
}

/** How a change is announced: a banner until it takes effect, and an email to everyone (its text; null: none) */
export interface Announcement { banner: boolean, email: string | null }

/** The draft and the versions before it, if it can be published; else a 400 error saying what to fix */
export async function checkDraft(document: LegalDocument): Promise<{ draft: LegalVersion, published: LegalVersion[] }> {
    const draft = await findDraft(document);
    if (!draft?.text.trim()) error(400, 'Write the text first');
    const blank = unfilled(draft.text);
    if (blank) error(400, `Write in or delete ${blank} first`);
    const published = await publishedVersions(document);
    if (draft.effectiveDate < today()) error(400, "It can't take effect in the past");
    if (published.some(({ effectiveDate }) => effectiveDate >= draft.effectiveDate)) error(400, 'It must take effect after the versions already published');
    if (published.length && !draft.changelog.trim()) error(400, 'Say what changes: people get it with the notice');
    return { draft, published };
}

/** Publishes the draft, announced as the admin chose */
export async function publishDraft(document: LegalDocument, announcement: Announcement): Promise<void> {
    const { draft, published } = await checkDraft(document);
    if (published.length && announcement.email != null) {
        if (!emailReady()) error(400, 'Set up outgoing email in Herd settings first');
        if (!announcement.email.trim()) error(400, 'Write the email');
    }
    await (await versions()).update(draft.id, { publishedDate: new Date(), banner: announcement.banner });
    if (published.length && announcement.email != null) emailEveryone(changeSubject(herdSettings().herdName, document), announcement.email);
}

