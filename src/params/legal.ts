import type { ParamMatcher } from '@sveltejs/kit';
import { LegalDocument } from '$lib/dbEntities/legal';

export const match = ((param: string): param is LegalDocument => Object.values<string>(LegalDocument).includes(param)) satisfies ParamMatcher;
