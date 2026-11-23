/** One setting, as a settings page shows it: read-only, or a field of the page's form, named `key` */
export type SettingEntry = { label: string, key: string, hint?: string } & (
    | { kind: 'text', value: string, placeholder?: string }
    | { kind: 'number', value: number }
    | { kind: 'toggle', value: boolean }
    | { kind: 'choice', value: string, options: { value: string, name: string }[] }
    | { kind: 'secret', isSet: boolean } // the value itself never leaves the server
    | { kind: 'lines', value: string[] } // one per line
);

export type SettingsSection = { id: string, title: string, hint?: string, entries: SettingEntry[] };
