import type { User } from '$lib/dbEntities/user'
import type { Band } from '$lib/dbEntities/band'
import type { Session } from '@auth/sveltekit'
import { error } from '@sveltejs/kit'
import slugify from 'slugify'

export interface BrontoSession {
    user: User,
    auth: Session,
    permissions: string[], // the herd role's; inside a band, its member's too
}

// Routes open to visitors: every other route needs a signed-in user. `/backline` checks access itself.
const PUBLIC_ROUTES = ['/', '/rules', '/@[handle]', '/signin', '/signout', '/join', '/join/[token]', '/set-password/[token]', '/forgot', '/confirm/[token]', '/welcome/[token]'];

/**
 * Whether visitors may reach a route, by its id: the route SvelteKit matched, not the URL, which may be
 * percent-encoded (`/%61pi/…` matches `/api/…`). No route (a 404) has nothing to guard.
 */
export function isPublicRoute(routeId: string | null): boolean {
    return routeId === null || PUBLIC_ROUTES.includes(routeId) || routeId === '/pictures/[id]' || routeId === '/backline' || routeId.startsWith('/backline/');
}

export const isApiRoute = (routeId: string | null) => !!routeId?.startsWith('/api/') || !!routeId?.startsWith('/@[handle]/api/');

/** A band's pages and API, at `/@<handle>/app/…` and `/@<handle>/api/…`: for its members only */
export const isBandRoute = (routeId: string | null) => !!routeId && /^\/@\[handle\]\/(app|api)(\/|$)/.test(routeId);

export function isValidId(slug: string): boolean {
    return slugify(slug) == slug
}

export function requirePermission(locals: App.Locals, permission: string): BrontoSession {
    const brontoSession: BrontoSession | null = locals['brontoSession'];
    if (!brontoSession?.permissions.includes(permission)) {
        error(403, 'Forbidden');
    }
    return brontoSession;
}

/** Inside a band: the user and the band, if their role in it allows `permission` */
export function requireBandPermission(locals: App.Locals, permission: string): { user: User, band: Band } {
    const { user } = requirePermission(locals, permission);
    if (!locals.membership) {
        error(404, 'Not found');
    }
    return { user, band: locals.membership.band };
}
