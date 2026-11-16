import { error } from '@sveltejs/kit';
import { routes, media } from '#lib/content.js';
import { normalize } from '#lib/markdown.js';

// every post, page, number and alias url is prerendered
export const entries = () => [...routes.keys()].map((path) => ({ path: path.slice(1, -1) }));

export function load({ params }) {
	const path = normalize(params.path);
	const item = routes.get(path);
	if (!item) error(404, 'not found');
	if (item.redirect) return { redirect: item.redirect };
	if (item.url !== path) return { redirect: item.url };
	return { item, media };
}
