import { pages } from '#lib/content.js';

// pages show up in the menu
export function load() {
	return { pages: pages.map(({ url, title }) => ({ url, title: title.toLowerCase() })) };
}
