export const devMode: boolean = true;
// export const apiToken: string = "dev-api-token"; // TODO: enforce external configuration
// The instance's two folders, the ones a deployment mounts: BRONTOSOUND_DATA_DIR and BRONTOSOUND_CONFIG_DIR move them
export const localDataRoot: string = process.env.BRONTOSOUND_DATA_DIR ?? 'data';
// The bands' own files, with herd storage. The rest of data/ is Brontosound's
export const filesRoot: string = `${localDataRoot}/files`;
// The operator's configuration of the whole instance: secrets and the built-in admin, see instanceConfig.ts
export const configRoot: string = process.env.BRONTOSOUND_CONFIG_DIR ?? 'config';
export const configFilename: string = 'config.json';
// Created by `npm run init`: until it exists, Brontosound only shows how to set it up
export const configPath: string = `${configRoot}/${configFilename}`;
// The built-in herd admin, whose password hash is in the config file (`adminPasswordHash`)
export const DEFAULT_ADMIN_USERNAME = 'admin';
