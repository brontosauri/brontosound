import { CredentialsSignin } from "@auth/sveltekit"
import { fail } from "@sveltejs/kit"
import { signIn } from "../../auth"
import { joiningBand } from "$lib/server/inviteLinks"
import { mayJoin, rememberInvite } from "$lib/server/registration"
import type { Actions, PageServerLoad } from "./$types"

// `?invite=<token>`: signing in to join with a band's invite link; back at it, they join
export const load: PageServerLoad = async ({ url, cookies, locals }) => {
    const token = url.searchParams.get('invite')
    const link = locals.brontoSession ? null : await rememberInvite(cookies, token)
    return { joining: link && joiningBand(link), mayJoinWithInvite: !!link && await mayJoin(token) }
}

export const actions: Actions = {
    default: async (event) => {
        try {
            await signIn(event)
        } catch (e) {
            // Wrong email/password: Auth.js throws instead of redirecting when called from a form action
            if (e instanceof CredentialsSignin) {
                return fail(['too_many_attempts', 'slow_down', 'busy'].includes(e.code) ? 429 : 400, { credentialsError: e.code })
            }
            throw e
        }
    }
}
