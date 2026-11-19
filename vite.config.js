import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { lucide } from './lucide.js';

export default defineConfig({
	// deploy number from GitHub Actions, shown at the bottom of the menu
	define: { __VERSION__: JSON.stringify(process.env.GITHUB_RUN_NUMBER ?? 'dev') },
	plugins: [
		lucide(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html' }),
			// posts and pages may not exist yet
			prerender: { handleUnseenRoutes: 'ignore' }
		})
	]
});
