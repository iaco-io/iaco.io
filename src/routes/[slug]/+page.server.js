import { error } from '@sveltejs/kit';
import { pages } from '#lib/content.js';

export const entries = () => pages.map(({ slug }) => ({ slug }));

export function load({ params }) {
	const item = pages.find((page) => page.slug === params.slug);
	if (!item) error(404, 'not found');
	return { item };
}
