import { posts, pages, menuIcon } from '#lib/content.js';
import { savedCategories, categoryIcons, tagName, DEFAULT_CATEGORY_ICON } from '#lib/tags.js';
import order from '../menu.json';

// pages show up in the menu, and so do the categories that something is tagged with
export function load() {
	const used = new Set([...posts, ...pages].flatMap((item) => item.tags));
	return {
		// in the order of their file names: 01-…, 02-…, then the ones without a number
		pages: pages
			.filter((p) => !p.unlisted)
			.toSorted((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
			.map(({ url, title, icon }) => ({ url, title: title.toLowerCase(), icon: menuIcon(icon) })),
		categories: savedCategories
			.filter((tag) => used.has(tag))
			.map((tag) => ({ tag, name: tagName(tag), icon: menuIcon(categoryIcons[tag] || DEFAULT_CATEGORY_ICON) })),
		// the order set in the cms (links by address); links not in it come after, as usual
		order: /** @type {string[]} */ (order)
	};
}
