// The legal templates' syntax: `{{name}}` takes a value. `[placeholders]` are for admins to write in or delete

export type TemplateValues = Record<string, string>;

/** The template with `values` in it. An empty value shows as `[name]`, for admins to fill in */
export function fillTemplate(template: string, values: TemplateValues): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
        if (!(name in values)) throw new Error(`The legal template uses {{${name}}}, which has no value`);
        return values[name] || `[${name}]`;
    });
}

/** The first `[placeholder]` left in `text`: bracketed, and not a Markdown link's text. Null if none */
export function unfilled(text: string): string | null {
    return text.match(/\[[^\]\n]+\](?!\()/)?.[0] ?? null;
}
