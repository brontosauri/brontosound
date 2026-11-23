import { error } from '@sveltejs/kit';
import { IsNull, Not } from 'typeorm';

import TypeOrm from '$lib/db';
import { HerdSettings } from '$lib/dbEntities/herd';
import { HerdRole, User } from '$lib/dbEntities/user';
import { DEFAULT_ADMIN_USERNAME } from '$lib/server/config';
import { isFolderName } from '$lib/server/storage';
import type { Soundfont } from '$lib/soundfonts';
import type { Limits } from '$lib/quotas';
import { MAPS_PROVIDERS, type MapsConfig, type MapsProviderId } from '$lib/maps/providers';

/** The herd's settings: in the database, edited by herd admins. Bands' own settings are on the Band */
export enum Registrations {
    OPEN = 'open',     // anyone can join the herd
    INVITE = 'invite', // a band's invite link lets someone join
    CLOSED = 'closed', // only admins add people
}

export interface HerdSettingsData {
    herdName: string;
    tagline: string;
    contactEmail: string;
    rules: string[]; // paragraphs, shown at sign-up and on /rules
    registrations: Registrations;
    googleSignUp: boolean; // a first Google sign-in creates the account, within `registrations`
    confirmEmails: boolean; // new accounts confirm their email before signing in (needs outgoing email)
    smtpHost: string; // outgoing email (mail.ts)
    smtpPort: number;
    smtpUsername: string;
    smtpPassword?: string;
    smtpFrom: string; // e.g. "Riverside herd <hello@riverside.example>"
    locale: string; // the default language and date format
    adminPasswordSignIn: boolean; // false: the built-in admin can't sign in (once other admins exist)
    adminsNeedTwoStep: boolean; // herd admins open the admin pages only with two-step verification on
    breachedPasswordCheck: boolean; // refuse new passwords found in data breaches (Have I Been Pwned; docs/authentication.md)
    herdStorageFolder: string; // in data/files: a band on herd storage gets `<folder>/<handle>`
    webdavAllowed: boolean; // bands may keep their songs on their own WebDAV server
    webdavLocalServers: boolean; // ...also on the herd's own network (a NAS next to the server, say)
    webdavConcurrentConnections: number;
    ytInvidiousEnabled: boolean;
    ytInvidiousServer: string;
    mapsProvider: MapsProviderId; // docs/maps.md
    mapboxToken?: string;
    hereApiKey?: string;
    googlemapsToken?: string;
    osmTileServer: string;
    osmNominatimServer?: string; // no default: check the public server's usage policy first (docs/maps.md)
    soundfonts: Soundfont[]; // MIDI.js soundfonts by URL, besides those in data/soundfonts (docs/songPage.md)
    defaultSoundfont?: string; // by name
    backlineStunServers: string[]; // tell Backline and the browsers on /backline their public addresses (docs/backline.md)
    quotas: Limits; // the herd's defaults ($lib/quotas.ts)
}

export const defaultHerdSettings: HerdSettingsData = {
    herdName: "Brontosound herd",
    tagline: "Where bands keep their songs, chase gigs and play the show.",
    contactEmail: "",
    rules: [],
    registrations: Registrations.CLOSED,
    googleSignUp: true,
    confirmEmails: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpFrom: "",
    locale: "it-IT",
    adminPasswordSignIn: true,
    adminsNeedTwoStep: false,
    breachedPasswordCheck: true,
    herdStorageFolder: "bands",
    webdavAllowed: true,
    webdavLocalServers: false,
    webdavConcurrentConnections: 5,
    ytInvidiousEnabled: true,
    ytInvidiousServer: "https://yewtu.be/",
    mapsProvider: "openstreetmap",
    osmTileServer: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    soundfonts: [],
    backlineStunServers: ["stun:stun.l.google.com:19302"],
    quotas: { bandsPerUser: 2, storagePerBand: 5, largestFile: 200, membersPerBand: 20, backlineGuests: 50 },
}

const SETTINGS_ID = 1;
let cachedSettings: HerdSettingsData | null = null;

/** Reads the herd's settings, creating them on first boot. Called once at startup (setup.ts): then they're in memory */
export async function loadHerdSettings(): Promise<void> {
    const rows = await TypeOrm.getRepository(HerdSettings);
    const row = await rows.findOneBy({ id: SETTINGS_ID }) ?? await rows.save({ id: SETTINGS_ID, settings: {} });
    cachedSettings = { ...defaultHerdSettings, ...row.settings };
    cachedSettings.quotas = { ...defaultHerdSettings.quotas, ...cachedSettings.quotas }; // with quotas added since
}

export function herdSettings(): HerdSettingsData {
    if (!cachedSettings) {
        throw new Error("Herd settings are read at startup (setup.ts)");
    }
    return cachedSettings;
}

/** Saves changed settings, after checking them (a 400 error). Only what differs from the defaults is stored */
export async function saveHerdSettings(changes: Partial<HerdSettingsData>): Promise<void> {
    const settings = { ...herdSettings(), ...changes };
    await checkHerdSettings(settings);
    const differing = Object.entries(settings).filter(([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(defaultHerdSettings[key as keyof HerdSettingsData]));
    await (await TypeOrm.getRepository(HerdSettings)).save({ id: SETTINGS_ID, settings: Object.fromEntries(differing) });
    cachedSettings = settings;
}

async function checkHerdSettings(settings: HerdSettingsData): Promise<void> {
    if (!settings.herdName) error(400, 'The herd needs a name');
    if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) error(400, `Not an email address: ${settings.contactEmail}`);
    if (!Intl.DateTimeFormat.supportedLocalesOf(settings.locale).length) error(400, `Unknown language: ${settings.locale}`);
    if (!settings.herdStorageFolder.split('/').every(isFolderName)) error(400, 'The herd storage folder is a path of folder names inside data/files, like "bands"');
    if (settings.confirmEmails && !(settings.smtpHost && settings.smtpFrom)) error(400, 'New accounts can confirm their email once outgoing email is set up');
    if (settings.webdavConcurrentConnections < 1) error(400, 'WebDAV needs at least 1 connection per band');
    for (const url of [settings.osmTileServer, settings.ytInvidiousServer, settings.osmNominatimServer]) {
        if (url && !isWebAddress(url)) error(400, `Not a web address: ${url}`);
    }
    if (!settings.adminPasswordSignIn && !await (await TypeOrm.getRepository(User)).existsBy({
        herdRole: HerdRole.ADMIN, removedDate: IsNull(), username: Not(DEFAULT_ADMIN_USERNAME),
    })) {
        error(400, 'Turn off the built-in admin once another herd admin exists: nobody could run the herd otherwise');
    }
}

const isWebAddress = (url: string) => /^https?:\/\/[^/]/i.test(url) && URL.canParse(url);

/** What the browser may know of the herd's settings */
export function safeHerdSettings() {
    const settings = herdSettings();
    return {
        locale: settings.locale,
        maps: mapsConfig(settings),
    }
}

/** The selected maps provider, with only its own browser key */
function mapsConfig(settings: HerdSettingsData): MapsConfig {
    const provider = MAPS_PROVIDERS[settings.mapsProvider];
    return {
        provider: settings.mapsProvider,
        key: provider?.keySetting ? settings[provider.keySetting] : undefined,
        tileServer: settings.osmTileServer,
        nominatimServer: settings.osmNominatimServer,
    };
}
