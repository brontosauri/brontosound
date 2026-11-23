import { Column, Entity, ManyToOne } from "typeorm";
import { UserCreatedEntity } from "./user";
import { Band } from "./band";

// A Backline app linked to its creator's account, playing for one of their bands. It signs in with a token, of which only
// the hash is kept
@Entity()
export class BacklineLink extends UserCreatedEntity {
    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE', eager: true })
    band: Band;

    @Column({ type: 'varchar', unique: true })
    tokenHash: string;
}
