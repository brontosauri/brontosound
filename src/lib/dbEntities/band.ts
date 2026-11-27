import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Exclude } from "class-transformer";
import type { QuotaOverrides } from "$lib/quotas";
import { User, Visibility } from "./user";

export enum BandRole {
    OWNER = 'owner',
    EDITOR = 'editor',
    VIEWER = 'viewer',
}

const VIEWER_PERMISSIONS = ['songbook.read', 'live.read', 'contacts.read', 'band.read'];
const EDITOR_PERMISSIONS = [...VIEWER_PERMISSIONS, 'songbook.write', 'live.write', 'contacts.write'];

// Inside a band, the session gets its member's permissions (hooks.server.ts); checked with `requireBandPermission()`
export const permissionsFromBandRole: Record<BandRole, string[]> = {
    [BandRole.VIEWER]: VIEWER_PERMISSIONS,
    [BandRole.EDITOR]: EDITOR_PERMISSIONS,
    [BandRole.OWNER]: [...EDITOR_PERMISSIONS, 'band.manage', 'members.manage'],
};

export enum BandStorage {
    HERD = 'herd',     // a folder of the herd's own files (data/files)
    WEBDAV = 'webdav', // the band's own WebDAV server
}

@Entity()
export class Band {
    @PrimaryGeneratedColumn()
    id: number;

    // Its address, `/@handle`: shared with users' handles (see handles.ts)
    @Column({ type: 'varchar', unique: true })
    handle: string;

    @Column({ type: 'varchar' })
    name: string;

    // A URL (/pictures/<id>); null: the Brontosound mark
    @Column({ type: 'varchar', nullable: true })
    logo: string | null;

    // Its public profile (/@handle)
    @Column({ type: 'simple-enum', enum: Visibility, default: Visibility.PUBLIC })
    visibility: Visibility;

    @Column({ type: 'varchar', default: '' })
    about: string;

    @Column({ type: 'varchar', default: '' })
    genres: string; // comma-separated

    @Column({ type: 'varchar', default: '' })
    city: string;

    @Column({ type: 'varchar', default: '' })
    publicEmail: string;

    @Column({ type: 'simple-json', default: '[]' })
    links: string[]; // web addresses

    @Column({ type: 'boolean', default: true })
    showGigs: boolean; // confirmed gigs to come: date, venue, city

    @Column({ type: 'boolean', default: true })
    showMembers: boolean; // those whose own profile allows it

    @Column({ type: 'simple-enum', enum: BandStorage, default: BandStorage.HERD })
    storage: BandStorage;

    // Its folder in data/files, set when the band is created: changing the herd's storage folder doesn't move it
    @Column({ type: 'varchar' })
    herdFolder: string;

    @Column({ type: 'varchar', nullable: true })
    webdavServer: string | null;

    @Column({ type: 'varchar', nullable: true })
    webdavUsername: string | null;

    @Exclude()
    @Column({ type: 'varchar', nullable: true, select: false })
    webdavPassword?: string | null;

    // The songs folder on the band's WebDAV server
    @Column({ type: 'varchar', nullable: true })
    webdavSongsFolder: string | null;

    @ManyToOne(() => User, { nullable: true })
    createdBy: User | null;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    creationDate: Date;

    // Set while a herd admin suspends the band: locked for its members; nothing is deleted
    @Column({ type: 'datetime', nullable: true })
    suspendedDate: Date | null;

    // Why, as admins told its owners (DSA art. 17): emailed, and shown to its members
    @Column({ type: 'varchar', nullable: true })
    suspensionReason: string | null;

    // Herd admins' exceptions to the herd's quotas ($lib/quotas.ts)
    @Column({ type: 'simple-json', default: '{}' })
    quotaOverrides: QuotaOverrides;
}

@Entity()
@Unique(['band', 'user'])
export class Membership {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    band: Band;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'simple-enum', enum: BandRole })
    role: BandRole;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    joinedDate: Date;
}

/** What the browser may know of a band, with the user's role in it */
export type BandSummary = Pick<Band, 'id' | 'handle' | 'name' | 'logo'> & { role: BandRole };

// An invitation for a user in the herd to join a band with a role: they find it in their profile
@Entity()
export class Invite {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    band: Band;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'simple-enum', enum: BandRole })
    role: BandRole;

    @ManyToOne(() => User, { nullable: true })
    createdBy: User | null;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    creationDate: Date;

    @Column({ type: 'datetime' })
    expiresDate: Date;
}

// A band's invite link (inviteLinks.ts): one at a time, for viewers, until its places are taken or it expires.
// A new link takes over the row; an ended one stays, to tell who opens it why
@Entity()
export class InviteLink {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn()
    band: Band;

    // Kept as is, not hashed: owners copy the link while it works
    @Exclude()
    @Column({ type: 'varchar', unique: true, select: false })
    token: string;

    @Column({ type: 'integer' })
    places: number;

    @Column({ type: 'integer', default: 0 })
    joined: number;

    @ManyToOne(() => User, { nullable: true })
    createdBy: User | null;

    @Column({ type: 'datetime' })
    expiresDate: Date;

    @Column({ type: 'datetime', nullable: true })
    revokedDate: Date | null;
}
