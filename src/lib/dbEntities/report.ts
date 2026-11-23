import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user";

// Someone in the herd telling its admins a public profile breaks the herd's rules
@Entity()
export class ProfileReport {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar' })
    handle: string; // the profile's, at the time

    @Column({ type: 'varchar' })
    reason: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    reporter: User | null;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    date: Date;
}
