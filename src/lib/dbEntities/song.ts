import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from "typeorm"
import { ManyToMany, JoinTable } from "typeorm"
import { Band } from "./band"

@Entity()
export class Song {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    band: Band

    @Column({ type: 'varchar'})
    artist: string

    @Column({ type: 'varchar'})
    title: string

    @Column({type: 'varchar'})
    storedDirName: string

    @Column({type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
    creationDate: Date

    @Column({type: 'boolean'})
    deleted: boolean

    @ManyToMany(() => SongTag, songTag => songTag.songs)
    @JoinTable()
    tags: SongTag[]

    /** Files the song page opens with, as paths relative to the song folder */
    @Column({type: 'varchar', nullable: true})
    pinnedDocument: string | null

    @Column({type: 'varchar', nullable: true})
    pinnedAudio: string | null
}

// A folder of the songs folder, as last listed: the Songbook matches songs to these by name
@Entity()
export class SongFolder {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    band: Band

    @Column({type: 'varchar'})
    name: string

    @Column({type: 'datetime'})
    syncDate: Date
}

@Entity()
@Unique(['band', 'name'])
export class SongTag {
    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => Band, { nullable: false, onDelete: 'CASCADE' })
    band: Band

    @Column({type: 'varchar'})
    name: string

    @ManyToMany(() => Song, song => song.tags)
    songs: Song[]
}