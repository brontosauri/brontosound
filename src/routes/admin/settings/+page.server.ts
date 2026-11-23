import { error, fail, isHttpError } from '@sveltejs/kit';
import { herdSettings, Registrations, saveHerdSettings, type HerdSettingsData } from '$lib/server/herdSettings';
import { requireHerdAdmin } from '$lib/server/admin';
import { settingsFromForm } from '$lib/server/settingsForm';
import { text } from '$lib/server/input';
import { listSoundfonts } from '$lib/server/soundfonts';
import { testSmtp } from '$lib/server/mail';
import { MAPS_PROVIDERS } from '$lib/maps/providers';
import { LOCALES } from '$lib/locales';
import type { SettingEntry, SettingsSection } from '$lib/components/settings/settingEntries';
import type { Actions, PageServerLoad } from './$types';

type Key = keyof HerdSettingsData;

const EMAIL_SECTION = 'email';


/** The herd settings form, with the saved values. Secrets (tokens, keys) are never sent */
async function sections(): Promise<SettingsSection[]> {
    const s = herdSettings();
    const text = (label: string, key: Key, hint?: string): SettingEntry => ({ kind: 'text', label, key, hint, value: String(s[key] ?? '') });
    const number = (label: string, key: Key, hint?: string): SettingEntry => ({ kind: 'number', label, key, hint, value: Number(s[key]) });
    const toggle = (label: string, key: Key, hint?: string): SettingEntry => ({ kind: 'toggle', label, key, hint, value: Boolean(s[key]) });
    const secret = (label: string, key: Key): SettingEntry => ({ kind: 'secret', label, key, isSet: Boolean(s[key]) });
    const lines = (label: string, key: Key, hint?: string): SettingEntry => ({ kind: 'lines', label, key, hint, value: s[key] as string[] });
    const choice = (label: string, key: Key, options: { value: string, name: string }[], hint?: string): SettingEntry =>
        ({ kind: 'choice', label, key, hint, value: String(s[key] ?? ''), options });

    const soundfonts = [{ value: '', name: 'The first one after the synth' }, ...(await listSoundfonts()).map(({ name }) => ({ value: name, name }))];
    return [
        { id: "herd", title: "Herd", entries: [
            text("Herd name", "herdName"),
            text("Tagline", "tagline"),
            text("Contact email", "contactEmail", "Shown when registrations are closed, and in the footer."),
            choice("Default language and dates", "locale", LOCALES, "Each person can pick their own."),
            lines("Herd rules", "rules", "One paragraph per line. Shown at sign-up and in the footer."),
        ] },
        { id: "registrations", title: "Registrations", entries: [
            choice("Who can join", "registrations", [
                { value: Registrations.OPEN, name: "Open: anyone can join the herd" },
                { value: Registrations.INVITE, name: "Invite only: a band's invite link lets someone join" },
                { value: Registrations.CLOSED, name: "Closed: only admins add people, in Users" },
            ]),
            toggle("Joining with Google", "googleSignUp", "Creates the account at the first Google sign-in, within the mode above."),
            toggle("New accounts confirm their email", "confirmEmails", "Needs outgoing email, below."),
        ] },
        { id: EMAIL_SECTION, title: "Outgoing email", hint: "For email invites, password links and address checks. Without it, you and band owners pass links on yourselves.", entries: [
            text("SMTP server", "smtpHost", undefined),
            number("Port", "smtpPort", "587 (STARTTLS) or 465 (TLS)."),
            text("Username", "smtpUsername"),
            secret("Password", "smtpPassword"),
            text("From", "smtpFrom", 'Like "Riverside herd <hello@riverside.example>".'),
        ] },
        { id: "security", title: "Sign-in and security", hint: "The admin password stays in config/config.json (npm run hash-password).", entries: [
            toggle("Refuse passwords found in data breaches", "breachedPasswordCheck", "Checks Have I Been Pwned with the first 5 characters of the password's hash."),
            toggle("Admins must use two-step verification", "adminsNeedTwoStep", "Admins without it open the admin pages once they turn it on in their profile."),
            toggle("Built-in admin can sign in", "adminPasswordSignIn", "Turn it off once another admin exists."),
        ] },
        { id: "storage", title: "Storage", entries: [
            text("Herd storage folder", "herdStorageFolder", "In data/files: each new band on herd storage gets its folder here. Bands never see this path."),
            toggle("Bands can use their own WebDAV", "webdavAllowed", "Owners pick it in their band's storage settings. Turning it off keeps current WebDAV bands working."),
            toggle("WebDAV servers may be on this herd's network", "webdavLocalServers", "Only if you trust every band: otherwise they could reach what only this server can."),
            number("WebDAV connections per band", "webdavConcurrentConnections"),
        ] },
        { id: "maps", title: "Maps", hint: "The provider draws venue maps and finds places for every band, with its own key.", entries: [
            choice("Provider", "mapsProvider", Object.entries(MAPS_PROVIDERS).map(([value, { name }]) => ({ value, name }))),
            text("OpenStreetMap tile server", "osmTileServer"),
            text("Nominatim server", "osmNominatimServer", "Check the public server's usage policy first."),
            secret("Mapbox token", "mapboxToken"),
            secret("HERE API key", "hereApiKey"),
            secret("Google Maps token", "googlemapsToken"),
        ] },
        { id: "soundfonts", title: "Soundfonts and YouTube", hint: "MIDI files play through these. Each person picks one in the player.", entries: [
            choice("Default soundfont", "defaultSoundfont", soundfonts),
            toggle("Play YouTube links through Invidious", "ytInvidiousEnabled", "No Google tracking in the practice player."),
            text("Invidious server", "ytInvidiousServer"),
        ] },
        { id: "backline", title: "Backline", entries: [
            lines("STUN servers", "backlineStunServers", "One per line. They tell Backline and browsers their public address, for a direct path between networks. Empty: everything goes through this server. Guest limits are in Quotas."),
        ] },
    ];
}

export const load = (async ({ locals }) => {
    requireHerdAdmin(locals);
    return {
        pageTitle: "Herd settings",
        breadcrumb: [{ title: "Herd settings" }],
        sections: await sections(),
        soundfonts: herdSettings().soundfonts,
        testEmailTo: locals.brontoSession!.user.email ?? '',
    };
}) satisfies PageServerLoad;

/** Saves a change; its expected errors (a value refused) reach the page as a message */
async function save(changes: () => Promise<Partial<HerdSettingsData>>) {
    try {
        await saveHerdSettings(await changes());
        return { saved: true };
    } catch (e) {
        if (isHttpError(e)) return fail(e.status, { error: e.body.message });
        throw e;
    }
}

export const actions = {
    // One section's settings: the form sends only its fields
    save: async ({ request, locals }) => {
        requireHerdAdmin(locals);
        const form = await request.formData();
        return save(async () => {
            const section = (await sections()).find(section => section.id == form.get('section'));
            if (!section) error(400, 'No such section');
            return settingsFromForm(section.entries, form);
        });
    },
    addSoundfont: async ({ request, locals }) => {
        requireHerdAdmin(locals);
        const form = await request.formData();
        return save(async () => {
            const name = text(form.get('name') ?? '', 'name').trim(), url = text(form.get('url') ?? '', 'url').trim();
            if (!name || !/^https:\/\/[^/]/.test(url)) error(400, 'A soundfont needs a name and an https:// address');
            if ((await listSoundfonts()).some(soundfont => soundfont.name == name)) error(409, `There's already a soundfont called ${name}`);
            return { soundfonts: [...herdSettings().soundfonts, { name, url }] };
        });
    },
    // The outgoing email fields as they are in the form, saved or not: they stay there to fix
    testEmail: async ({ request, locals }) => {
        requireHerdAdmin(locals);
        const form = await request.formData();
        try {
            const entries = (await sections()).find(section => section.id == EMAIL_SECTION)!.entries;
            const to = text(form.get('testEmailTo') ?? '', 'test email address').trim();
            await testSmtp({ ...herdSettings(), ...settingsFromForm(entries, form) }, to);
            return { smtpWorks: true, emailed: to };
        } catch (e) {
            if (isHttpError(e)) return fail(e.status, { smtpError: e.body.message });
            throw e;
        }
    },
    removeSoundfont: async ({ request, locals }) => {
        requireHerdAdmin(locals);
        const name = (await request.formData()).get('name');
        return save(async () => ({ soundfonts: herdSettings().soundfonts.filter(soundfont => soundfont.name != name) }));
    },
} satisfies Actions;
