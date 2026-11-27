import type { SettingEntry, TextFormat } from '$lib/components/settings/settingEntries';
import { herdSettings, type HerdSettingsData } from './herdSettings';

type Key = keyof HerdSettingsData;

/** Builders of herd settings' form entries, with the saved values. Secrets (tokens, keys) are never sent */
export function herdSettingEntries() {
    const s = herdSettings();
    return {
        text: (label: string, key: Key, hint?: string, format?: TextFormat, placeholder?: string): SettingEntry => ({ kind: 'text', label, key, hint, format, placeholder, value: String(s[key] ?? '') }),
        number: (label: string, key: Key, hint?: string): SettingEntry => ({ kind: 'number', label, key, hint, value: Number(s[key]) }),
        toggle: (label: string, key: Key, hint?: string): SettingEntry => ({ kind: 'toggle', label, key, hint, value: Boolean(s[key]) }),
        secret: (label: string, key: Key): SettingEntry => ({ kind: 'secret', label, key, isSet: Boolean(s[key]) }),
        lines: (label: string, key: Key, hint?: string, format?: 'verbatim'): SettingEntry => ({ kind: 'lines', label, key, hint, format, value: s[key] as string[] }),
        choice: (label: string, key: Key, options: { value: string, name: string }[], hint?: string): SettingEntry =>
            ({ kind: 'choice', label, key, hint, value: String(s[key] ?? ''), options }),
    };
}
