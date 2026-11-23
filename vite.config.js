import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/** Drops dependencies' own code warnings from the build log: they aren't ours to fix */
const DEPENDENCY_WARNINGS = ['UNUSED_EXTERNAL_IMPORT', 'INVALID_ANNOTATION', 'SOURCEMAP_ERROR'];
/** @param {import('rollup').RollupLog} log */
const inDependencies = (log) => {
	const ids = log.ids ?? (log.id ? [log.id] : []);
	return ids.length > 0 && ids.every((id) => id.includes('/node_modules/'));
};
/** @type {import('vite').Plugin} */
const quietDependencies = {
	name: 'quiet-dependencies',
	onLog: (level, log) => !(DEPENDENCY_WARNINGS.includes(log.code ?? '') && inDependencies(log))
};

/** Entities reach the browser too: give it TypeORM's decorators only, not all of TypeORM */
/** @type {import('vite').Plugin} */
const typeormInBrowser = {
	name: 'typeorm-in-browser',
	enforce: 'pre',
	resolveId: (id, importer, options) => id == 'typeorm' && !options?.ssr ? fileURLToPath(new URL('src/lib/typeormBrowser.ts', import.meta.url)) : null
};

export default defineConfig({
	plugins: [typeormInBrowser, sveltekit(), quietDependencies],
	build: {
		chunkSizeWarningLimit: 600 // kB: pdf.js is ~500, loaded only when a PDF opens
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	ssr: {
		external: ['reflect-metadata'],
		// noExternal: ['google-maps']
	},
});
