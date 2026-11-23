import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { checkServerAddress } from './publicAddress';

const refused = (url: string, allowLocal = false) => checkServerAddress(url, allowLocal).then(() => false, e => isHttpError(e) && e.status == 400);

describe("bands' server addresses", () => {
    it("can't point at the herd's own network", async () => {
        for (const url of ['http://127.0.0.1/', 'https://10.1.2.3/dav', 'http://192.168.1.20', 'http://169.254.169.254/', 'http://[::1]/', 'http://[fd00::1]/', 'http://[::ffff:192.168.1.1]/', 'http://0.0.0.0']) {
            expect(await refused(url), url).toBe(true);
        }
    });

    it('are web addresses on the internet, or anywhere when the herd allows local servers', async () => {
        expect(await refused('https://93.184.216.34/remote.php/dav')).toBe(false);
        expect(await refused('http://192.168.1.20', true)).toBe(false);
        for (const url of ['ftp://93.184.216.34/', 'file:///etc/passwd', 'not a url']) {
            expect(await refused(url, true), url).toBe(true);
        }
    });
});
