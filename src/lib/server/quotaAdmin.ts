import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Band } from '$lib/dbEntities/band';
import { User } from '$lib/dbEntities/user';
import { QUOTA_KEYS, QUOTAS, type Limit, type Limits, type QuotaKey, type QuotaOverride, type QuotaOverrides } from '$lib/quotas';
import { saveHerdSettings } from './herdSettings';
import { validHandle } from './handles';

// What herd admins change of the quotas (/admin/quotas): the herd's defaults, and overrides for a person or band

export interface OverrideRow {
    kind: 'user' | 'band';
    id: number;
    name: string;
    handle: string | null;
    key: QuotaKey;
    override: QuotaOverride;
}

const repository = (kind: 'user' | 'band') => TypeOrm.getRepository<User | Band>(kind == 'user' ? User : Band);

export async function listOverrides(): Promise<OverrideRow[]> {
    const db = await TypeOrm.getDb();
    const owners = [
        ...(await db.getRepository(User).createQueryBuilder('user').addSelect('user.quotaOverrides').where('user.removedDate IS NULL').getMany())
            .map(user => ({ kind: 'user' as const, owner: user })),
        ...(await db.getRepository(Band).find()).map(band => ({ kind: 'band' as const, owner: band })),
    ];
    return owners.flatMap(({ kind, owner }) => Object.entries(owner.quotaOverrides ?? {}).map(([key, override]) =>
        ({ kind, id: owner.id, name: owner.name, handle: owner.handle, key: key as QuotaKey, override: override! })));
}

export async function saveDefaults(quotas: Limits): Promise<void> {
    await saveHerdSettings({ quotas });
}

/** A limit from a form: a whole number, or null with its "no limit" box ticked */
export function limitFromForm(form: FormData, field: string, label: string): Limit {
    if (form.has(`${field}NoLimit`)) return null;
    const limit = Number(form.get(field) ?? '');
    if (form.get(field) === '' || !Number.isInteger(limit) || limit < 0) error(400, `${label}: a whole number, 0 or more, or no limit`);
    return limit;
}

/** Overrides quota `key` for the person or band at `handle` */
export async function setOverride(handle: unknown, key: QuotaKey, limit: Limit, reason: string, by: User): Promise<void> {
    const kind = QUOTAS[key].for;
    const owners = await repository(kind);
    const owner = await owners.createQueryBuilder('owner').addSelect('owner.quotaOverrides')
        .where('owner.handle = :handle', { handle: validHandle(handle) }).getOne();
    if (!owner) error(404, `No ${kind} has the handle @${validHandle(handle)}: "${QUOTAS[key].label}" is for ${kind == 'user' ? 'people' : 'bands'}`);
    const override: QuotaOverride = { limit, reason, setBy: by.name, date: new Date().toISOString() };
    await owners.update(owner.id, { quotaOverrides: { ...owner.quotaOverrides, [key]: override } });
}

export async function removeOverride(kind: 'user' | 'band', id: number, key: QuotaKey): Promise<void> {
    const owners = await repository(kind);
    const owner = await owners.createQueryBuilder('owner').addSelect('owner.quotaOverrides').where('owner.id = :id', { id }).getOne();
    if (!owner) error(404, 'Not found');
    const overrides: QuotaOverrides = { ...owner.quotaOverrides };
    delete overrides[key];
    await owners.update(id, { quotaOverrides: overrides });
}

export const isQuotaKey = (value: unknown): value is QuotaKey => QUOTA_KEYS.includes(value as QuotaKey);
