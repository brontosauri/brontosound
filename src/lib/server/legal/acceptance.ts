import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { User } from '$lib/dbEntities/user';
import { herdSettings } from '../herdSettings';
import { termsVersion } from './documents';

// Accepting the Terms: at sign-up, or after joining with Google (/accept). Recorded on the User

export type TermsAcceptance = Pick<User, 'termsAcceptedAt' | 'termsVersion'>;

/** What the Terms checkboxes say (TermsCheckboxes.svelte) */
export function termsCheckboxes() {
    const { minimumAge, signUpConsent } = herdSettings();
    return { minimumAge, consent: signUpConsent };
}

/** The Terms checkboxes a form sent, refused unless ticked: what to save on the User */
export async function termsAcceptance(form: FormData): Promise<TermsAcceptance> {
    if (!form.has('terms') || (herdSettings().signUpConsent && !form.has('consent'))) {
        error(400, 'Tick the boxes to accept the Terms');
    }
    return { termsAcceptedAt: new Date(), termsVersion: await termsVersion() };
}

/** Unlocks the app for someone who joined with Google */
export async function acceptTerms(user: User, form: FormData): Promise<void> {
    await (await TypeOrm.getRepository(User)).update(user.id, { ...await termsAcceptance(form), mustAcceptTerms: false });
}
