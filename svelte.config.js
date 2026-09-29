import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
		// GitHub Pages serves the site from /<repo-name>; the deploy workflow sets BASE_PATH.
		paths: { base: process.env.BASE_PATH ?? '' }
	}
};

export default config;
