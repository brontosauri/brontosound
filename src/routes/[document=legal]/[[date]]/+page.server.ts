import { legalPage } from '$lib/server/legal/documents';
import type { LegalDocument } from '$lib/dbEntities/legal';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => ({
    document: params.document as LegalDocument,
    ...await legalPage(params.document as LegalDocument, params.date),
})) satisfies PageServerLoad;
