const TEMPLATE_SECRET = 'a-secret-of-your-choice'; // a placeholder someone may have copied
const RECOMMENDED_LENGTH = 32;
const HOW_TO = 'Generate one with: openssl rand -base64 32';

/** Refuses a missing or placeholder authSecret, with which anyone could forge sessions; warns about a short one */
export function checkAuthSecret(secret: string | undefined): void {
    if (!secret || secret === TEMPLATE_SECRET) {
        throw new Error(`authSecret in config/config.json is missing or still the placeholder. ${HOW_TO}`);
    }
    const warning = authSecretWarning(secret);
    if (warning) console.warn(warning);
}

/** What's wrong with a secret the server accepts, for admins to fix; null when nothing is */
export function authSecretWarning(secret: string | undefined): string | null {
    return (secret?.length ?? 0) < RECOMMENDED_LENGTH
        ? `authSecret in config/config.json is shorter than ${RECOMMENDED_LENGTH} characters, so sessions are easier to forge. ${HOW_TO}, then restart.`
        : null;
}
