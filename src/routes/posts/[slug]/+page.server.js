import { error } from '@sveltejs/kit';
import { posts } from '#lib/content.js';

export const entries = () => posts.map(({ slug }) => ({ slug }));

export function load({ params }) {
	const item = posts.find((post) => post.slug === params.slug);
	if (!item) error(404, 'not found');
	return { item };
}
