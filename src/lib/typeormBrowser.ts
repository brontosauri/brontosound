/**
 * `typeorm` in the browser build (see vite.config.js): entities are shared with the client
 * as plain classes, so their decorators do nothing there. Anything else from TypeORM is server only.
 */
const noOp = () => () => {};

export const Entity = noOp;
export const Column = noOp;
export const PrimaryColumn = noOp;
export const PrimaryGeneratedColumn = noOp;
export const OneToOne = noOp;
export const OneToMany = noOp;
export const ManyToOne = noOp;
export const ManyToMany = noOp;
export const JoinColumn = noOp;
export const JoinTable = noOp;
export const Unique = noOp;
export const BeforeInsert = noOp;

export class DataSource {
    constructor() {
        throw new Error('The database is server only');
    }
}
