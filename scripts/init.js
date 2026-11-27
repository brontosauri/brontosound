// Sets up a new Brontosound herd: config/config.json (from config/config.template.json, with a generated authSecret and the admin password), then the data
// folder (empty database and files folders). Leaves what already exists alone.
//   npm run init
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { configPath, configRoot, filesRoot, localDataRoot } from '../src/lib/server/config.ts';
import { hashPassword } from '../src/lib/server/password.ts';
import { askNewPassword, closePrompt } from './prompt.js';

async function createConfig() {
	console.error(`Setting up ${configRoot}/ for your herd.\n`);
	console.error('Choose a password for the "admin" user.');
	const password = await askNewPassword();

	await mkdir(configRoot, { recursive: true });
	const template = JSON.parse(await readFile('config/config.template.json', 'utf-8'));
	const config = {
		...template,
		adminPasswordHash: await hashPassword(password),
		authSecret: randomBytes(32).toString('base64'),
	};
	await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
	console.error(`\nCreated ${configPath}. For Google sign-in, set googleClientId and googleClientSecret there.`);
}

async function createDataFolder() {
	await mkdir(`${localDataRoot}/database`, { recursive: true });
	await mkdir(filesRoot, { recursive: true });
	console.error(`Created ${localDataRoot}/. Bands' songs go in ${filesRoot}/.`);
}

const needsConfig = !existsSync(configPath), needsDataFolder = !existsSync(localDataRoot);
if (needsConfig) await createConfig();
if (needsDataFolder) await createDataFolder();
closePrompt();

console.error(needsConfig || needsDataFolder
	? `\nStart Brontosound (or reload its page) and sign in as "admin": herd settings are in the app.`
	: `${configPath} and ${localDataRoot}/ exist: Brontosound is set up.`);
