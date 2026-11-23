import { error } from '@sveltejs/kit';
import type { SettingEntry } from '$lib/components/settings/settingEntries';
import { oneOf, text } from './input';

/** The values a settings form sent for `entries`, by key. A secret left blank keeps its value: it isn't among them */
export function settingsFromForm(entries: SettingEntry[], form: FormData): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const entry of entries) {
        const value = form.get(entry.key) ?? '';
        if (entry.kind == 'toggle') {
            values[entry.key] = form.has(entry.key); // a checkbox is sent only when checked
        } else if (entry.kind == 'number') {
            const number = Number(value);
            if (value === '' || !Number.isInteger(number) || number < 0) error(400, `${entry.label}: a whole number, 0 or more`);
            values[entry.key] = number;
        } else if (entry.kind == 'choice') {
            values[entry.key] = oneOf(value, Object.fromEntries(entry.options.map(({ value }) => [value, value])), entry.label);
        } else if (entry.kind == 'lines') {
            values[entry.key] = text(value, entry.label).split('\n').map(line => line.trim()).filter(Boolean);
        } else if (entry.kind != 'secret' || value !== '') {
            values[entry.key] = text(value, entry.label).trim();
        }
    }
    return values;
}
