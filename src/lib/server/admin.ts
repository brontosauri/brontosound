import { error } from '@sveltejs/kit';
import { herdSettings } from './herdSettings';
import { requirePermission, type BrontoSession } from './session';

/** A herd admin's session, with two-step verification on if the herd asks admins for it */
export function requireHerdAdmin(locals: App.Locals): BrontoSession {
    const session = requirePermission(locals, 'herd.admin');
    if (herdSettings().adminsNeedTwoStep && !session.user.totpEnabled) {
        error(403, 'Herd admins need two-step verification: turn it on in your profile, then come back');
    }
    return session;
}
