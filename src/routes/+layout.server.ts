import { herdSettings, Registrations } from '$lib/server/herdSettings';
import { emailReady } from '$lib/server/mail';
import { upcomingChanges } from '$lib/server/legal/documents';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const session = event.locals['brontoSession'];
  return {
    herdName: herdSettings().herdName,
    herdContact: herdSettings().contactEmail,
    registrationsOpen: herdSettings().registrations == Registrations.OPEN,
    emailReady: emailReady(),
    locale: session?.user.locale ?? herdSettings().locale, // for dates ($lib/dates.ts)
    brontoSession: session,
    legalChanges: session ? await upcomingChanges() : [], // published, not yet in force
  }
};
