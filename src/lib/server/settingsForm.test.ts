import { describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import type { SettingEntry } from '$lib/components/settings/settingEntries';

vi.mock('$lib/db', () => ({ default: {} }));

import { settingsFromForm } from './settingsForm';

const entries: SettingEntry[] = [
    { kind: 'text', label: 'Herd name', key: 'herdName', value: '' },
    { kind: 'toggle', label: 'Check', key: 'check', value: true },
    { kind: 'toggle', label: 'Other', key: 'other', value: true },
    { kind: 'number', label: 'Connections', key: 'connections', value: 5 },
    { kind: 'choice', label: 'Provider', key: 'provider', value: 'osm', options: [{ value: 'osm', name: 'OSM' }, { value: 'here', name: 'HERE' }] },
    { kind: 'secret', label: 'Token', key: 'token', isSet: true },
    { kind: 'lines', label: 'STUN', key: 'stun', value: [] },
];

const formOf = (fields: Record<string, string>) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.set(key, value));
    return form;
};

const valid = { herdName: ' Riverside ', check: '', connections: '3', provider: 'here', token: '', stun: 'stun:a:1\n\n stun:b:2 ' };

describe('settings forms', () => {
    it('read each kind of field, and keep secrets left blank', () => {
        expect(settingsFromForm(entries, formOf(valid))).toEqual({
            herdName: 'Riverside', check: true, other: false, connections: 3, provider: 'here', stun: ['stun:a:1', 'stun:b:2'],
        });
        expect(settingsFromForm(entries, formOf({ ...valid, token: 'new' })).token).toBe('new');
    });

    it('refuse values out of their kind', () => {
        for (const fields of [{ connections: '-1' }, { connections: '2.5' }, { connections: '' }, { provider: 'google' }]) {
            try {
                settingsFromForm(entries, formOf({ ...valid, ...fields }));
                expect.fail(JSON.stringify(fields));
            } catch (e) {
                expect(isHttpError(e) && e.status).toBe(400);
            }
        }
    });
});
