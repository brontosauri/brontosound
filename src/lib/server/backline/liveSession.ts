// The bands' live sessions: for each band, the one Backline app that announced its Live page, and the browsers
// watching it on /backline. Kept in memory. This server only decides who gets in and passes messages along: it never
// reads them, and the page the browsers show is the one Backline sent (see docs/backline.md).

import { error } from '@sveltejs/kit';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Mailbox } from './mailbox';
import { herdSettings } from '../herdSettings';

const GONE_MS = 45_000; // without a pull for this long, Backline or a browser is gone

/** What Backline receives: a browser joined, left, or sent message `m` */
type HostItem = { c: string, join?: string, leave?: true, m?: string };

interface Host {
    band: number;      // the id of the band it plays for
    instance: string;  // names one run of the Backline app
    tokenHash: string; // of the link it signed in with
    public: boolean;   // anyone with the PIN gets in; else band members only
    pin: string;
    page: string;      // the HTML of its remote
    inbox: Mailbox<HostItem>;
    guests: Set<string>; // tokens of visitors who gave the PIN: they hold these, never the PIN
}

interface Client {
    band: number;
    name: string;
    guest: boolean; // not a band member: let in by PIN, and counted against the band's guest seats
    inbox: Mailbox<string>;
}

const hosts = new Map<number, Host>(); // by band id
const clients = new Map<string, Client>();

/** Ends a band's live session: its Backline and its browsers */
function end(host: Host): void {
    host.inbox.release();
    hosts.delete(host.band);
    clients.forEach((client, id) => {
        if (client.band === host.band) {
            client.inbox.release();
            clients.delete(id);
        }
    });
}

// Forgets whoever stopped pulling
function sweep(): void {
    const now = Date.now();
    hosts.forEach(host => now - host.inbox.lastPull > GONE_MS && end(host));
    clients.forEach((client, id) => {
        if (now - client.inbox.lastPull > GONE_MS) {
            clients.delete(id);
            hosts.get(client.band)?.inbox.push({ c: id, leave: true });
        }
    });
}

// ---- Backline's side ----

export interface Announcement {
    band: number;
    instance: string;
    tokenHash: string;
    public: boolean;
    pin: string;
    page: string;
}

/**
 * Makes a Backline its band's live one. Another Backline that was live for the band is kicked out, and so are its
 * browsers. Guests' PINs pick the session they join, so a PIN live in another band's public session is refused
 */
export function announce(a: Announcement): { next: number, ice: string[] } {
    sweep();
    if (a.public && [...hosts.values()].some(host => host.band !== a.band && host.public && host.pin === a.pin)) {
        error(409, 'Another band is live with this PIN: choose another one');
    }
    let host = hosts.get(a.band);
    if (host?.instance !== a.instance) {
        if (host) end(host);
        host = { ...a, inbox: new Mailbox(), guests: new Set() };
        hosts.set(a.band, host);
    } else {
        if (a.pin !== host.pin) {
            host.guests.clear(); // a new PIN lets in only who knows it
        }
        Object.assign(host, a);
    }
    return { next: host.inbox.next, ice: herdSettings().backlineStunServers };
}

/** The band's live Backline, if it is the one asking: 404 when none is live, 409 when another one took over */
export function hostFor(band: number, instance: string, tokenHash: string): Host {
    sweep();
    const host = hosts.get(band);
    if (!host) {
        error(404, 'Not announced');
    }
    if (host.instance !== instance) {
        error(409, 'Another Backline took over');
    }
    if (host.tokenHash !== tokenHash) {
        error(401, 'Unknown token');
    }
    return host;
}

/** Messages from Backline to its band's browsers */
export function toClients(host: Host, items: { c: string, m: string }[]): void {
    for (const { c, m } of items) {
        const client = clients.get(c);
        if (client?.band === host.band) {
            client.inbox.push(m);
        }
    }
}

/** The band was suspended or deleted: its live session ends */
export function endBandSession(band: number): void {
    const host = hosts.get(band);
    if (host) end(host);
}

/** A link was removed: its Backline is no longer welcome */
export function dropHost(tokenHash: string): void {
    hosts.forEach(host => host.tokenHash === tokenHash && end(host));
}

// ---- The browsers' side ----

/** The band's live session as a visitor may know it, or null when its Backline isn't live */
export function liveBackline(band: number): { public: boolean, page: string } | null {
    sweep();
    const host = hosts.get(band);
    return host ? { public: host.public, page: host.page } : null;
}

/** Whether some band shares its live session publicly: visitors are then asked for a PIN */
export function anyPublicSession(): boolean {
    sweep();
    return [...hosts.values()].some(host => host.public);
}

/** The band a guest token lets in, while its Backline shares publicly */
export function guestBand(guestToken: string | undefined): number | null {
    const host = [...hosts.values()].find(host => host.public && !!guestToken && host.guests.has(guestToken));
    return host?.band ?? null;
}

/** Band members always get in; others with a guest token, when Backline shares publicly */
export function mayEnter(band: number, member: boolean, guestToken: string | undefined): boolean {
    return hosts.has(band) && (member || guestBand(guestToken) === band);
}

/** A guest token for the public session with this PIN, and its band; else null */
export function admitGuest(pin: string): { band: number, token: string } | null {
    const host = [...hosts.values()].find(host => host.public && isPin(pin, host.pin));
    if (!host) {
        return null;
    }
    const token = randomBytes(24).toString('base64url');
    host.guests.add(token);
    return { band: host.band, token };
}

function isPin(pin: string, expectedPin: string): boolean {
    const [given, expected] = [Buffer.from(pin), Buffer.from(expectedPin)];
    return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Seats a browser and tells Backline. Returns its id, or null when all `guestSeats` are taken (null: no limit).
 * Members always get in
 */
export function join(band: number, name: string, guest: boolean, guestSeats: number | null): string | null {
    sweep();
    const guests = [...clients.values()].filter(client => client.band === band && client.guest).length;
    if (guest && guestSeats !== null && guests >= guestSeats) {
        return null;
    }
    const id = randomBytes(8).toString('hex');
    clients.set(id, { band, name, guest, inbox: new Mailbox() });
    hosts.get(band)?.inbox.push({ c: id, join: name });
    return id;
}

/** A browser's mailbox: 410 when it is not seated (any more), so it joins again */
export function clientFor(id: string): Client {
    sweep();
    const client = clients.get(id);
    if (!client) {
        error(410, 'Join again');
    }
    return client;
}

/** Messages from a browser to its band's Backline */
export function toHost(id: string, messages: string[]): void {
    const host = hosts.get(clientFor(id).band);
    for (const m of messages) {
        host?.inbox.push({ c: id, m });
    }
}
