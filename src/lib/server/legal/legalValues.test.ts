import { describe, expect, it } from 'vitest';
import { defaultHerdSettings } from '../herdSettings';
import { legalValues } from './legalValues';
import { fillTemplate } from './template';
import terms from './terms.md?raw';
import privacy from './privacy.md?raw';

describe('legal templates', () => {
    it('have a value for every name, and leave no tag behind', () => {
        for (const template of [terms, privacy]) {
            expect(fillTemplate(template, legalValues(defaultHerdSettings))).not.toMatch(/\{\{|\}\}/);
        }
    });
});
