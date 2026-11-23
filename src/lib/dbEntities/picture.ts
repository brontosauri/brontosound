import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Exclude } from "class-transformer";

// An uploaded picture (an avatar, a band's logo), served at /pictures/<id>: its random id is its only address
@Entity()
export class Picture {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Exclude()
    @Column({ type: 'blob', select: false })
    data: Buffer;

    @Column({ type: 'varchar' })
    mime: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    creationDate: Date;
}
