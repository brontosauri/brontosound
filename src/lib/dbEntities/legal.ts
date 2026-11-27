import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** The herd's legal texts, each at /<document> (legal/documents.ts) */
export enum LegalDocument {
    TERMS = 'terms',
    PRIVACY = 'privacy',
}

// A version of a legal text, as Mastodon's TermsOfService: a draft until published, in force from its effective date
@Entity()
export class LegalVersion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'simple-enum', enum: LegalDocument })
    document: LegalDocument;

    @Column({ type: 'text' })
    text: string; // Markdown

    // What changes from the version before, for the people it's announced to
    @Column({ type: 'text', default: '' })
    changelog: string;

    // A change shows a banner to signed-in people until it takes effect: the admin chooses when publishing
    @Column({ type: 'boolean', default: true })
    banner: boolean;

    // YYYY-MM-DD; also the version's address, /<document>/<date>, and the Terms version people accept
    @Column({ type: 'varchar' })
    effectiveDate: string;

    // Null: a draft, seen by herd admins only
    @Column({ type: 'datetime', nullable: true })
    publishedDate: Date | null;
}
