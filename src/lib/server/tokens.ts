import { createHash, randomBytes } from 'node:crypto';

// Secrets handed out in links (invites, Backline links): long and random, so a plain hash is enough to store them

export function newToken(): string {
    return randomBytes(24).toString('base64url');
}

export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
