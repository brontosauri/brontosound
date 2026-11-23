import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { User, Visibility } from '$lib/dbEntities/user';
import { claimHandle, validHandle } from './handles';
import { oneOf, text } from './input';
import { LOCALES } from '$lib/locales';
import { savePicture } from './pictures';

// What each person changes of their own profile (/me), and shows at /@handle

const MAX_ABOUT = 2000;

/** A text field of a profile form, trimmed, up to `max` characters */
function field(form: FormData, name: string, max = 100) {
    const value = text(form.get(name) ?? '', name).trim();
    if (value.length > max) error(400, `"${name}" can be ${max} characters at most`);
    return value;
}

/** Their name and language, from the details form */
export async function saveDetails(user: User, form: FormData): Promise<void> {
    const name = field(form, 'name');
    if (!name) error(400, 'Your display name, please');
    await (await TypeOrm.getRepository(User)).update(user.id, {
        name,
        locale: form.get('locale') ? oneOf(form.get('locale'), Object.fromEntries(LOCALES.map(({ value }) => [value, value])), 'language') : null,
    });
}

/** What /@handle shows, and to whom, from the public profile form, field by field */
export async function saveProfile(user: User, form: FormData): Promise<void> {
    const website = field(form, 'website', 300);
    if (website && !/^https?:\/\/[^/]/i.test(website)) error(400, 'The website starts with https://');
    await (await TypeOrm.getRepository(User)).update(user.id, {
        website,
        instruments: field(form, 'instruments'),
        city: field(form, 'city'),
        about: field(form, 'about', MAX_ABOUT),
        visibility: oneOf(form.get('visibility'), Visibility, 'visibility'),
        showBands: form.has('showBands'),
    });
}

/** Picks the user's handle, once: then only herd admins change it */
export async function pickHandle(user: User, handle: unknown): Promise<void> {
    if (user.handle) error(400, 'Your handle is set: ask the herd\'s admins to change it');
    const newHandle = validHandle(handle);
    await claimHandle(newHandle, async () => (await TypeOrm.getRepository(User)).update(user.id, { handle: newHandle }));
}

export async function saveAvatar(user: User, file: unknown): Promise<void> {
    const avatar = await savePicture(file, user.avatar);
    await (await TypeOrm.getRepository(User)).update(user.id, { avatar });
}
