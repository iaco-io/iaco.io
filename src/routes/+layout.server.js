import { posts, pages } from '#lib/content.js';
import { savedCategories } from '#lib/tags.js';

// pages show up in the menu, and so do the categories that something is tagged with
export function load() {
	const used = new Set([...posts, ...pages].flatMap((item) => item.tags));
	return {
		pages: pages.filter((p) => !p.hidden).map(({ url, title }) => ({ url, title: title.toLowerCase() })),
		categories: savedCategories.filter((tag) => used.has(tag))
	};
}
