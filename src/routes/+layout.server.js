import { pages } from '#lib/content.js';

// pages show up in the menu
export function load() {
	return { pages: pages.map(({ slug, title }) => ({ slug, title: title.toLowerCase() })) };
}
