// tags sort posts and pages into topics. some tags are promoted to categories (listed in src/categories.json):
// they show with a bookmark icon instead of a tag, and appear in the blog's menu
import categories from '../categories.json';

/** a tag as it's stored and used in urls: lowercase, words joined by dashes */
export const cleanTag = (/** @type {string} */ tag) =>
	tag
		.trim()
		.toLowerCase()
		.replace(/^#+/, '')
		.replace(/\s+/g, '-')
		.replace(/[^\p{L}\p{N}-]/gu, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

/** the categories saved with the site */
export const savedCategories = /** @type {string[]} */ (categories);

export const tagUrl = (/** @type {string} */ tag) => `/tag/${tag}/`;
