import { PROJECT_URL } from '$lib/project';
import type { HerdSettingsData } from '../herdSettings';
import type { TemplateValues } from './template';

// What the legal templates (terms.md, privacy.md) say of a herd, from its settings. The rest is static text: admins
// write in the [placeholders], and keep only the [if used] items the herd uses, as with Mastodon's generated terms

export function legalValues(settings: HerdSettingsData): TemplateValues {
    return {
        herdName: settings.herdName,
        contactEmail: settings.contactEmail,
        contactLanguage: languageName(settings.locale), // the EU Digital Services Act asks contact points to say it
        sourceUrl: PROJECT_URL,
        minimumAge: String(settings.minimumAge),
    };
}

/** "Italian", for "it-IT" */
function languageName(locale: string): string {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.split('-')[0]) ?? locale;
}
