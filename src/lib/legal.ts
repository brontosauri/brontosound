// The herd's legal texts, as people see them: at /terms and /privacy, past versions at /<document>/<date>

export type LegalDocumentId = 'terms' | 'privacy';

export const LEGAL_TITLES: Record<LegalDocumentId, string> = {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
};

/** A published version people should know of before it takes effect */
export interface LegalChange {
    document: LegalDocumentId;
    effectiveDate: string;
}

/** The subject of the email announcing a change */
export const changeSubject = (herdName: string, document: LegalDocumentId) => `${herdName} updates its ${LEGAL_TITLES[document]}`;

/** The email announcing a change, as admins first see it to edit */
export function changeEmailText({ herdName, document, date, changelog, url }: { herdName: string, document: LegalDocumentId, date: string, changelog: string, url: string }): string {
    return [
        `${herdName} updates its ${LEGAL_TITLES[document]} on ${date}.`,
        `What changes:\n${changelog}`,
        `Read it: ${url}`,
        ...(document == 'terms' ? ["If you don't agree, you can delete your account in your profile before then."] : []),
        herdName,
    ].join('\n\n');
}
