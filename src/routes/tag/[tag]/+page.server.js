import { error } from '@sveltejs/kit';
import { posts, pages, menuIcon } from '#lib/content.js';
import { savedCategories, categoryIcons, tagName, DEFAULT_CATEGORY_ICON } from '#lib/tags.js';

const items = [...posts, ...pages];
const tags = [...new Set(items.flatMap((item) => item.tags))];

// a page for every tag used in a post or page
export const entries = () => tags.map((tag) => ({ tag }));

export function load({ params }) {
	const tagged = items.filter((item) => item.tags.includes(params.tag));
	if (!tagged.length) error(404, 'not found');
	return {
		tag: params.tag,
		category: savedCategories.includes(params.tag),
		// a category's own icon, as in the menu
		icon: savedCategories.includes(params.tag) ? menuIcon(categoryIcons[params.tag] || DEFAULT_CATEGORY_ICON) : null,
		name: tagName(params.tag), // underscores as spaces
		items: tagged.map(({ url, title, description, image, kind }) => ({ url, title, description, image, kind }))
	};
}
