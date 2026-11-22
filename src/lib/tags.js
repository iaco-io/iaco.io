// tags sort posts and pages into topics. some tags are promoted to categories (listed in src/categories.json):
// they show with a bookmark icon instead of a tag, and appear in the blog's menu
import categories from '../categories.json';

/** a tag as it's stored and used in urls: lowercase, words joined by dashes (underscores stay, and show as spaces) */
export const cleanTag = (/** @type {string} */ tag) =>
	tag
		.trim()
		.toLowerCase()
		.replace(/^#+/, '')
		.replace(/\s+/g, '-')
		.replace(/[^\p{L}\p{N}_-]/gu, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

// src/categories.json lists the categories: a tag alone, or { tag, icon } when it has its own icon
// (a lucide icon, lucide/name, or a media file); without one, a category shows a bookmark
/** @typedef {string | { tag: string, icon?: string }} Saved */
export const DEFAULT_CATEGORY_ICON = 'lucide/book-bookmark';

/** the file's list as category tags and their icons */
export function readCategories(/** @type {Saved[]} */ list) {
	const tags = list.map((c) => (typeof c === 'string' ? c : c.tag));
	/** @type {Record<string, string>} */
	const icons = {};
	for (const c of list) if (typeof c !== 'string' && c.icon) icons[c.tag] = c.icon;
	return { tags, icons };
}

/** back to the file's form */
export const writeCategories = (/** @type {string[]} */ tags, /** @type {Record<string, string>} */ icons) =>
	tags.map((tag) => (icons[tag]?.trim() ? { tag, icon: icons[tag].trim() } : tag));

const saved = readCategories(/** @type {Saved[]} */ (categories));
/** the categories saved with the site, and their icons */
export const savedCategories = saved.tags;
export const categoryIcons = saved.icons;

/** a tag as shown: underscores are spaces (health_fundamentals → health fundamentals) */
export const tagName = (/** @type {string} */ tag) => tag.replace(/_/g, ' ');

export const tagUrl = (/** @type {string} */ tag) => `/tag/${tag}/`;
