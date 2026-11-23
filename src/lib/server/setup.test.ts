import { describe, expect, it, vi } from 'vitest';
import { isConfigured } from '$lib/server/instanceConfig';
import { ensureDefaultAdmin } from '$lib/server/users';

vi.mock('$lib/server/instanceConfig', () => ({ isConfigured: vi.fn(), instanceConfig: () => ({ authSecret: 'a'.repeat(44) }) }));
vi.mock('$lib/server/herdSettings', () => ({ loadHerdSettings: vi.fn() }));
vi.mock('$lib/server/users', () => ({ ensureDefaultAdmin: vi.fn() }));

import { isSetUp, setupPage } from './setup';

describe('setup', () => {
    it('waits for config/config.json, then starts the app once', async () => {
        vi.mocked(isConfigured).mockReturnValue(false);
        expect(await isSetUp()).toBe(false);
        expect(ensureDefaultAdmin).not.toHaveBeenCalled();

        vi.mocked(isConfigured).mockReturnValue(true);
        expect(await isSetUp()).toBe(true);
        expect(await isSetUp()).toBe(true);
        expect(ensureDefaultAdmin).toHaveBeenCalledTimes(1);
    });

    it('explains how to set up, as unavailable', async () => {
        const response = setupPage();
        expect(response.status).toBe(503);
        expect(await response.text()).toContain('npm run init');
    });
});
