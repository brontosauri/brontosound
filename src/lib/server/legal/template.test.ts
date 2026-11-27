import { describe, expect, it } from 'vitest';
import { fillTemplate, unfilled } from './template';

describe('fillTemplate', () => {
    it('fills values, and marks empty ones', () => {
        expect(fillTemplate('Run by {{who}}, {{where}}.', { who: 'Ada', where: '' })).toBe('Run by Ada, [where].');
    });

    it('refuses names it has no value for', () => {
        expect(() => fillTemplate('{{missing}}', {})).toThrow(/missing/);
    });

    it('finds values left to fill in', () => {
        expect(unfilled('Run by [who], see [link](/x).')).toBe('[who]');
        expect(unfilled('Run by Ada, see [link](/x).')).toBe(null);
    });
});
