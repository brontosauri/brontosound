import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit";
import { randomBytes } from "node:crypto";
import { handle as authenticationHandle } from "./auth"
import { sequence } from "@sveltejs/kit/hooks";
import { isApiRoute, isBandRoute, isPublicRoute, type BrontoSession } from "$lib/server/session";
import { User, permissionsFromHerdRole } from "$lib/dbEntities/user";
import { permissionsFromBandRole, type Membership } from "$lib/dbEntities/band";
import { instanceToPlain } from "class-transformer";
import { error, redirect } from "@sveltejs/kit";
import { findActiveUser } from "$lib/server/users";
import { findMembership } from "$lib/server/bands";
import { isSetUp, setupPage } from "$lib/server/setup";
import { configPath } from "$lib/server/config";

export const init: ServerInit = async () => {
    if (!await isSetUp()) {
        console.warn(`${configPath} or its authSecret is missing: pages show how to set up, with npm run init`);
    }
}

// Every request gets the setup instructions until `npm run init` has run: the first one after starts the app
export const setupHandle: Handle = async ({ event, resolve }) => await isSetUp() ? resolve(event) : setupPage();

export const debugHandle: Handle = async ({ event, resolve }) => {
    // console.log("env:",env);
    return resolve(event);
}

export const authorizationHandle: Handle = async ({ event, resolve }) => {
    const authSession = await event.locals.auth();
    // console.log("authSession:", authSession);
    let brontoSession: BrontoSession | null = null;
    let membership: Membership | null = null;

    // Looked up on every request, so removed users lose access immediately
    const userId = Number(authSession?.user?.id);
    const brontoUser = userId ? await findActiveUser(userId) : null;

    // Authenticated user
    if (authSession && brontoUser) {
        // A band's pages are for its members only: others, herd admins too, don't see it exists
        if (isBandRoute(event.route.id)) {
            membership = await findMembership(event.params.handle ?? '', brontoUser.id);
            if (!membership) {
                error(404, 'Not found');
            }
            if (membership.band.suspendedDate) {
                error(403, `The herd's admins suspended this band: ${membership.band.suspensionReason ?? 'ask them why'}`);
            }
        }
        // Joined with Google: nothing but the Terms until they accept them
        if (brontoUser.mustAcceptTerms && !isPublicRoute(event.route.id) && event.route.id !== '/accept') {
            if (isApiRoute(event.route.id)) {
                error(403, 'Accept the Terms first');
            }
            redirect(303, `/accept?then=${encodeURIComponent(event.url.pathname + event.url.search)}`);
        }
        brontoSession = {
            user: instanceToPlain(brontoUser) as User,
            auth: authSession,
            permissions: [...permissionsFromHerdRole[brontoUser.herdRole], ...(membership ? permissionsFromBandRole[membership.role] : [])],
        }

        // Unauthenticated user
    } else if (!isPublicRoute(event.route.id)) {
        if (isApiRoute(event.route.id)) {
            error(401, 'Your session has expired. Sign in again.');
        }
        redirect(303, '/');
    }

    event.locals['brontoSession'] = brontoSession;
    event.locals.membership = membership;

    return resolve(event)
};

// Defence in depth: pages can't be framed by other sites (clickjacking), and browsers don't guess content types.
// No CSP yet: it needs a policy per maps provider, and its own for /backline
const SECURITY_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export const securityHeadersHandle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(name, value);
    }
    return response;
};

// Unexpected errors: the details (paths, SQL, WebDAV URLs) stay in the server log, under an id the user can quote.
// Expected ones, thrown with `error(4xx, message)`, never get here: their message reaches the UI as is
export const handleError: HandleServerError = ({ error, status, message }) => {
    if (status < 500) {
        return { message };
    }
    const id = randomBytes(4).toString('hex');
    console.error(`Error ${id}:`, error);
    return { message: `Something went wrong (error ${id})` };
}

export const handle: Handle = sequence(securityHeadersHandle, setupHandle, debugHandle, authenticationHandle, authorizationHandle)
