import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../herdSettings', () => ({ herdSettings: () => ({ backlineStunServers: ['stun:stun.example:3478'] }) }));

import { admitGuest, announce, anyPublicSession, clientFor, dropHost, guestBand, hostFor, join, liveBackline, mayEnter, toClients, toHost } from './liveSession';
import { Mailbox } from './mailbox';

const BAND = 1, OTHER_BAND = 2;
const backline = { band: BAND, instance: 'a', tokenHash: 'hash', public: true, pin: '123456', page: '<p>remote</p>' };
const otherBackline = { band: OTHER_BAND, instance: 'z', tokenHash: 'other', public: true, pin: '999999', page: '<p>other</p>' };

describe('mailbox', () => {
    it('keeps messages until a later pull confirms them', async () => {
        const box = new Mailbox<string>();
        box.push('one');
        box.push('two');
        expect(await box.pull(0)).toEqual({ next: 2, items: ['one', 'two'] });
        expect(await box.pull(1)).toEqual({ next: 2, items: ['two'] });
    });

    it('answers a waiting pull as soon as a message arrives', async () => {
        const box = new Mailbox<string>();
        const pull = box.pull(0);
        box.push('late');
        expect(await pull).toEqual({ next: 1, items: ['late'] });
    });
});

describe('live session', () => {
    beforeEach(() => ['hash', 'other'].forEach(dropHost));

    it('is live once a Backline announces, with the page it sent', () => {
        expect(liveBackline(BAND)).toBeNull();
        expect(announce(backline)).toEqual({ next: 0, ice: ['stun:stun.example:3478'] });
        expect(liveBackline(BAND)).toEqual({ public: true, page: '<p>remote</p>' });
        expect(liveBackline(OTHER_BAND)).toBeNull();
    });

    it('lets members in, and others with a guest token for the PIN when shared publicly', () => {
        expect(mayEnter(BAND, true, undefined)).toBe(false); // nothing is live
        announce(backline);
        expect(mayEnter(BAND, true, undefined)).toBe(true);
        expect(admitGuest('000000')).toBeNull();
        expect(admitGuest('')).toBeNull();
        const { band, token } = admitGuest('123456')!;
        expect(band).toBe(BAND);
        expect(mayEnter(BAND, false, token)).toBe(true);
        expect(mayEnter(BAND, false, '123456')).toBe(false); // the PIN itself is no pass
        expect(mayEnter(BAND, false, 'made-up')).toBe(false);
        announce({ ...backline, public: false });
        expect(mayEnter(BAND, false, token)).toBe(false);
        expect(admitGuest('123456')).toBeNull();
        expect(anyPublicSession()).toBe(false);
    });

    it('drops guests when the PIN changes or another Backline announces', () => {
        announce(backline);
        const { token } = admitGuest('123456')!;
        announce({ ...backline, page: '<p>new page</p>' });
        expect(mayEnter(BAND, false, token)).toBe(true);
        announce({ ...backline, pin: '654321' });
        expect(mayEnter(BAND, false, token)).toBe(false);
        const next = admitGuest('654321')!.token;
        announce({ ...backline, pin: '654321', instance: 'b' });
        expect(mayEnter(BAND, false, next)).toBe(false);
    });

    it('passes messages both ways', async () => {
        announce(backline);
        const host = hostFor(BAND, 'a', 'hash');
        const id = join(BAND, 'Anna', false, 2)!;
        toHost(id, ['{"t":"hello"}']);
        expect((await host.inbox.pull(0)).items).toEqual([{ c: id, join: 'Anna' }, { c: id, m: '{"t":"hello"}' }]);
        toClients(host, [{ c: id, m: '{"t":"hi"}' }, { c: 'nobody', m: 'lost' }]);
        expect((await clientFor(id).inbox.pull(0)).items).toEqual(['{"t":"hi"}']);
    });

    it('kicks out the previous Backline and its browsers when another announces', () => {
        announce(backline);
        const id = join(BAND, 'Anna', false, 2)!;
        announce({ ...backline, instance: 'b' });
        expect(() => hostFor(BAND, 'a', 'hash')).toThrow();
        expect(() => clientFor(id)).toThrow();
        expect(hostFor(BAND, 'b', 'hash').instance).toBe('b');
    });

    it('seats as many guests as the band may have, and members always', () => {
        announce(backline);
        expect(join(BAND, 'Guest', true, 2)).not.toBeNull();
        expect(join(BAND, 'Guest', true, 2)).not.toBeNull();
        expect(join(BAND, 'Guest', true, 2)).toBeNull();
        expect(join(BAND, 'Anna', false, 2)).not.toBeNull();
    });
});

describe("bands' live sessions", () => {
    beforeEach(() => ['hash', 'other'].forEach(dropHost));

    it('run side by side, each with its own Backline, guests and messages', async () => {
        announce(backline);
        announce(otherBackline);
        expect(hostFor(BAND, 'a', 'hash').band).toBe(BAND);
        expect(hostFor(OTHER_BAND, 'z', 'other').band).toBe(OTHER_BAND);

        const { band, token } = admitGuest('999999')!;
        expect(band).toBe(OTHER_BAND);
        expect(guestBand(token)).toBe(OTHER_BAND);
        expect(mayEnter(BAND, false, token)).toBe(false);
        expect(mayEnter(OTHER_BAND, false, token)).toBe(true);

        const anna = join(BAND, 'Anna', false, 2)!;
        toClients(hostFor(OTHER_BAND, 'z', 'other'), [{ c: anna, m: 'not for Anna' }]);
        toClients(hostFor(BAND, 'a', 'hash'), [{ c: anna, m: 'for Anna' }]);
        expect((await clientFor(anna).inbox.pull(0)).items).toEqual(['for Anna']);
    });

    it("refuse a public PIN that's live for another band", () => {
        announce(otherBackline);
        expect(() => announce({ ...backline, pin: '999999' })).toThrow();
        expect(announce({ ...backline, pin: '999999', public: false }).next).toBe(0);
    });

    it('count guests per band', () => {
        announce(backline);
        announce(otherBackline);
        join(BAND, 'Guest', true, 2);
        join(BAND, 'Guest', true, 2);
        expect(join(BAND, 'Guest', true, 2)).toBeNull();
        expect(join(OTHER_BAND, 'Guest', true, 2)).not.toBeNull();
    });

    it('end one at a time', () => {
        announce(backline);
        announce(otherBackline);
        dropHost('hash');
        expect(liveBackline(BAND)).toBeNull();
        expect(liveBackline(OTHER_BAND)).not.toBeNull();
    });
});
