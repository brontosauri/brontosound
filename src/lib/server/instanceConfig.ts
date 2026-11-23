import { existsSync, readFileSync } from 'fs';
import { configPath } from '$lib/server/config';

/** What only the server's operator sets, in config/config.json (the rest of the herd's settings are in the app) */
export interface InstanceConfig {
    authSecret?: string; // signs sessions; `npm run init` generates it
    googleClientId?: string; // Google sign-in is offered when both are set
    googleClientSecret?: string;
    adminPasswordHash?: string; // the built-in admin's password; generate with `npm run hash-password`
}

let cached: InstanceConfig | null = null;

/** The config file's content, read once: changes need a restart */
export function instanceConfig(): InstanceConfig {
    return cached ??= JSON.parse(readFileSync(configPath, 'utf-8'));
}

/** Whether `npm run init` has created the config with a secret */
export function isConfigured(): boolean {
    return existsSync(configPath) && !!instanceConfig().authSecret;
}
