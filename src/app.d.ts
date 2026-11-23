import "reflect-metadata" // Needed by TypeORM
import type { BrontoSession } from "$lib/server/session"
import type { Membership } from "$lib/dbEntities/band"

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			brontoSession: BrontoSession | null
			membership: Membership | null // on a band's routes: the user's, with its band
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
