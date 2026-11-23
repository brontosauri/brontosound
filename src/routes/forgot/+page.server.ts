import { error, fail } from '@sveltejs/kit';
import { sendPasswordReset } from '$lib/server/emailLinks';
import { emailReady } from '$lib/server/mail';
import { countLoginAttempt, MAX_LOGIN_ATTEMPTS } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

// "Forgot your password?": a link by email, when the herd has outgoing email
export const load = (() => {
    if (!emailReady()) error(404, "This herd can't send email: ask its admins for a new password link");
}) satisfies PageServerLoad;

export const actions = {
    default: async ({ request, url, getClientAddress }) => {
        if (countLoginAttempt(`forgot|${getClientAddress()}`) > MAX_LOGIN_ATTEMPTS) {
            return fail(429, { error: 'Too many requests from here. Try again in 15 minutes.' });
        }
        await sendPasswordReset(String((await request.formData()).get('email') ?? ''), url.origin);
        return { sent: true }; // the same whether or not there's such an account
    },
} satisfies Actions;
