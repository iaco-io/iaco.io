import { posts, pages, media } from '#lib/content.js';
import { isIcon } from '#lib/markdown.js';
import { savedCategories } from '#lib/tags.js';

/**
 * how a page's icon is drawn in the menu: lucide icons and one-colour svgs as a stencil in the text colour
 * (mask), other pictures as they are
 * @param {string} icon
 */
function menuIcon(icon) {
	const lucide = icon.match(/^lucide\/([a-z0-9-]+)$/);
	if (lucide) return { src: `/lucide/${lucide[1]}.svg`, mask: true };
	return { src: media[icon] ?? icon, mask: isIcon(icon) };
}

// pages show up in the menu, and so do the categories that something is tagged with
export function load() {
	const used = new Set([...posts, ...pages].flatMap((item) => item.tags));
	return {
		// in the order of their file names: 01-…, 02-…, then the ones without a number
		pages: pages
			.filter((p) => !p.unlisted)
			.toSorted((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
			.map(({ url, title, icon }) => ({ url, title: title.toLowerCase(), icon: menuIcon(icon) })),
		categories: savedCategories.filter((tag) => used.has(tag))
	};
}
