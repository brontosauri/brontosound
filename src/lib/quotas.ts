// Limits herd admins set: herd defaults for everyone, overridden for one person or band (docs/herd.md)

export const QUOTAS = {
    bandsPerUser: { label: 'Bands a person can create', unit: 'bands', for: 'user', hint: 'Joining bands by invite has no limit.' },
    storagePerBand: { label: 'Herd storage per band', unit: 'GB', for: 'band', hint: "Bands on their own WebDAV aren't counted: their space is up to them." },
    largestFile: { label: 'Largest file', unit: 'MB', for: 'band', hint: 'One upload to herd storage.' },
    membersPerBand: { label: 'Members per band', unit: 'people', for: 'band', hint: 'Pending invites and places left on invite links count too.' },
    backlineGuests: { label: 'Backline guests at once', unit: 'browsers', for: 'band', hint: "Browsers let in by PIN, per band; members don't count." },
} as const;

export type QuotaKey = keyof typeof QUOTAS;

/** A limit in the quota's unit; null: no limit */
export type Limit = number | null;

export type Limits = Record<QuotaKey, Limit>;

export interface QuotaOverride {
    limit: Limit;
    reason: string;
    setBy: string; // the admin's name
    date: string;
}

export type QuotaOverrides = Partial<Record<QuotaKey, QuotaOverride>>;

export const QUOTA_KEYS = Object.keys(QUOTAS) as QuotaKey[];

export const formatLimit = (key: QuotaKey, limit: Limit) => limit === null ? 'No limit' : `${limit} ${QUOTAS[key].unit}`;
