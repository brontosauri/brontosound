import { error } from '@sveltejs/kit';
import TypeOrm from '$lib/db';
import { Band } from '$lib/dbEntities/band';
import { ProfileReport } from '$lib/dbEntities/report';
import { User, Visibility } from '$lib/dbEntities/user';
import { text } from './input';

// Profiles people report to the herd's admins, who dismiss the report or hide the profile

const reports = () => TypeOrm.getRepository(ProfileReport);

export async function reportProfile(handle: string, reason: unknown, reporter: User): Promise<void> {
    const why = text(reason ?? '', 'reason').trim().slice(0, 500);
    if (!why) error(400, "Say what's wrong with this profile");
    await (await reports()).insert({ handle, reason: why, reporter: { id: reporter.id } });
}

export async function listReports() {
    return (await (await reports()).find({ relations: { reporter: true }, order: { date: 'DESC' } }))
        .map(({ id, handle, reason, date, reporter }) => ({ id, handle, reason, date, reporter: reporter?.name ?? null }));
}

async function findReport(id: number): Promise<ProfileReport> {
    const report = await (await reports()).findOneBy({ id });
    if (!report) error(404, 'No such report');
    return report;
}

export async function dismissReport(id: number): Promise<void> {
    await (await reports()).delete((await findReport(id)).id);
}

/** Hides the reported profile, whoever's it is, and closes its reports */
export async function hideReportedProfile(id: number): Promise<void> {
    const { handle } = await findReport(id);
    const db = await TypeOrm.getDb();
    await db.getRepository(Band).update({ handle }, { visibility: Visibility.HIDDEN });
    await db.getRepository(User).update({ handle }, { visibility: Visibility.HIDDEN });
    await (await reports()).delete({ handle });
}
