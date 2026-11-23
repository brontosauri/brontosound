import { BeforeInsert, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Exclude } from "class-transformer";
import type { QuotaOverrides } from "$lib/quotas";

// A role in the herd, the whole instance. Roles in a band are on its Membership
export enum HerdRole {
    ADMIN = 'admin', // herd settings, users and bands' metadata: never a band's content
    USER = 'user',
}

/** Who sees a public profile, a person's or a band's, at `/@handle` */
export enum Visibility {
    PUBLIC = 'public', // anyone with the link
    HIDDEN = 'hidden', // its bands' members only
}

// Checked with `requirePermission()`; inside a band, the band role's are added (see permissionsFromBandRole)
export const permissionsFromHerdRole: Record<HerdRole, string[]> = {
    [HerdRole.ADMIN]: ['herd.admin'],
    [HerdRole.USER]: [],
};


@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    // Internal and fixed: their email, `admin` for the built-in admin, or random for people without email
    @Column({ type: 'varchar', unique: true })
    username: string;

    // Their address, `/@handle`, shared with bands' handles (see handles.ts). Null until they pick one
    @Column({ type: 'varchar', unique: true, nullable: true })
    handle: string | null;

    @Column({ type: 'varchar' })
    name: string;

    // Their public profile (/@handle)
    @Column({ type: 'varchar', default: '' })
    about: string;

    @Column({ type: 'varchar', default: '' })
    instruments: string;

    @Column({ type: 'varchar', default: '' })
    city: string;

    @Column({ type: 'varchar', default: '' })
    website: string;

    @Column({ type: 'simple-enum', enum: Visibility, default: Visibility.HIDDEN })
    visibility: Visibility;

    // Their bands on their profile, and them among each band's members
    @Column({ type: 'boolean', default: true })
    showBands: boolean;

    // Their language and date format; null: the herd's
    @Column({ type: 'varchar', nullable: true })
    locale: string | null;

    // A URL (/pictures/<id>); null: their initials
    @Column({ type: 'varchar', nullable: true })
    avatar: string | null;

    @Exclude()
    @Column({ type: 'varchar', nullable: true, select: false })
    passwordHash: string | null;

    // Null for the default admin, and people who joined with an admin's invite link
    @Column({ type: 'varchar', unique: true, nullable: true })
    email: string | null;

    @Column({ type: 'simple-enum', enum: HerdRole, default: HerdRole.USER })
    herdRole: HerdRole;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    creationDate: Date;

    // Set when an admin removes the user: the row is kept so authored content keeps its attribution
    @Column({ type: 'datetime', nullable: true })
    removedDate?: Date | null;

    // Signed up while the herd asks new accounts to confirm their email, and hasn't yet: can't sign in until then
    @Column({ type: 'boolean', default: false })
    unconfirmedEmail: boolean;

    // Set while a herd admin suspends the user: they can't sign in, and their bands keep working
    @Column({ type: 'datetime', nullable: true })
    suspendedDate?: Date | null;

    // Herd admins' exceptions to the herd's quotas ($lib/quotas.ts), with their reasons: not for the browser
    @Exclude()
    @Column({ type: 'simple-json', default: '{}' })
    quotaOverrides: QuotaOverrides;

    // Sessions carry the value they were issued with; bumping it signs the user out everywhere
    @Column({ type: 'integer', default: 0 })
    sessionVersion: number;

    // Two-step verification (TOTP): the authenticator's secret, set while setting up, kept while it's on
    @Exclude()
    @Column({ type: 'varchar', nullable: true, select: false })
    totpSecret?: string | null;

    @Column({ type: 'boolean', default: false })
    totpEnabled: boolean;

    // The time step of the last code used: each code works once
    @Exclude()
    @Column({ type: 'integer', nullable: true, select: false })
    totpLastStep?: number | null;

    // The soundfont last picked in the player, by name
    @Column({ type: 'varchar', nullable: true })
    soundfont?: string | null;

    @OneToMany(() => UserAccount, account => account.user)
    accounts?: UserAccount[];
}

// An external account (Google SSO; later Spotify, Apple Music, ...) linked to a User
@Entity()
@Unique(['provider', 'providerAccountId'])
export class UserAccount {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.accounts, { nullable: false, onDelete: 'CASCADE' })
    user: User;

    @Column({ type: 'varchar' })
    provider: string;

    // The provider's stable account id (e.g. the OAuth `sub`)
    @Column({ type: 'varchar' })
    providerAccountId: string;

    @Column({ type: 'varchar', nullable: true })
    email: string | null;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    linkedDate?: Date;
}

export enum LinkPurpose {
    PASSWORD = 'password', // set their password: users an admin added, or who forgot it
    CONFIRM = 'confirm',   // confirm their email, after signing up
}

// A link sent to a user, working once (passwordLinks.ts)
@Entity()
export class PasswordLink {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'simple-enum', enum: LinkPurpose, default: LinkPurpose.PASSWORD })
    purpose: LinkPurpose;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    user: User;

    @Exclude()
    @Column({ type: 'varchar', unique: true, select: false })
    tokenHash: string;

    @Column({ type: 'datetime' })
    expiresDate: Date;
}

export abstract class UserCreatedEntity {
    @PrimaryGeneratedColumn()
    id: number

    // No cascade: it would let any API payload overwrite the referenced User (role, passwordHash)
    @ManyToOne(() => User, {nullable: true, eager: true})
    createdBy: User

    @ManyToOne(() => User, {nullable: true})
    lastModifiedBy: User

    @Column({type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
    creationDate?: Date

    @BeforeInsert()
    setCreatedByAsLastModifiedByDefault() {
        if (!this.createdBy && this.lastModifiedBy) {
            this.createdBy = this.lastModifiedBy;
        }
    }
}

// An invite into the herd from its admins (herdInvites.ts), working once: emailed, or a link they pass on
@Entity()
export class HerdInvite {
    @PrimaryGeneratedColumn()
    id: number;

    // Where it's emailed: their account's email. Null for a link: whoever opens it may be anyone, so no email
    @Column({ type: 'varchar', nullable: true })
    email: string | null;

    @Column({ type: 'simple-enum', enum: HerdRole, default: HerdRole.USER })
    herdRole: HerdRole;

    @Exclude()
    @Column({ type: 'varchar', unique: true, select: false })
    tokenHash: string;

    // Emailing it failed the last time: admins see it, and send it again
    @Column({ type: 'boolean', default: false })
    notSent: boolean;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    createdBy: User | null;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    creationDate: Date;

    @Column({ type: 'datetime' })
    expiresDate: Date;
}
