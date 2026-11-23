import { Column, Entity, PrimaryColumn } from "typeorm";

// The herd's settings, edited by its admins: one row, its settings merged with the defaults (see herdSettings.ts)
@Entity()
export class HerdSettings {
    @PrimaryColumn({ type: 'integer' })
    id: number;

    @Column({ type: 'simple-json' })
    settings: Record<string, unknown>;
}
