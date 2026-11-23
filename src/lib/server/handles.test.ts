import { describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

vi.mock('$lib/db', () => ({ default: {} }));

import { validHandle } from './handles';

const refused = (value: unknown) => {
    try {
        validHandle(value);
        return false;
    } catch (e) {
        return isHttpError(e) && e.status == 400;
    }
};

describe('handles', () => {
    it('are lowercase letters, digits and inner hyphens, 2 to 30 of them', () => {
        expect(validHandle('the-ammonites')).toBe('the-ammonites');
        expect(validHandle(' @Lucia ')).toBe('lucia');
        expect(validHandle('b2')).toBe('b2');
        for (const value of ['a', '-band', 'band-', 'tar pit', 'the_ammonites', 'x'.repeat(31), 'band/..', '', 7, null]) {
            expect(refused(value)).toBe(true);
        }
    });
});
