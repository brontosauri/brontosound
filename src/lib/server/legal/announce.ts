import { IsNull, Not } from 'typeorm';
import TypeOrm from '$lib/db';
import { User } from '$lib/dbEntities/user';
import { emailReady, sendEmail } from '../mail';

// Emailing everyone in the herd a change to a legal text, when an admin chooses to at publishing

const recipients = async () => (await TypeOrm.getRepository(User)).findBy({ email: Not(IsNull()), removedDate: IsNull() });

/** How many people the email would reach; null without outgoing email */
export async function recipientCount(): Promise<number | null> {
    return emailReady() ? (await recipients()).length : null;
}

/** In the background, as there may be many */
export function emailEveryone(subject: string, text: string): void {
    void (async () => {
        for (const { id, email } of await recipients()) {
            await sendEmail(email!, subject, text).catch(e => console.error(`Announcing a legal change to user ${id} failed:`, e));
        }
    })();
}
