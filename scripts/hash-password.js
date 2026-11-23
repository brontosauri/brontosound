// Prompts for a password and prints its hash, e.g. for `adminPasswordHash` in config/config.json
import { hashPassword } from '../src/lib/server/password.ts';
import { askNewPassword, closePrompt } from './prompt.js';

const password = await askNewPassword();
closePrompt();
console.log(await hashPassword(password));
