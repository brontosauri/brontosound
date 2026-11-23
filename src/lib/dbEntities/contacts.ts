import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Band } from "./band";

@Entity()
export class Contact {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    band: Band;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar', nullable: true })
    email: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string;

    @Column({ type: 'varchar', nullable: true })
    note: string;
}