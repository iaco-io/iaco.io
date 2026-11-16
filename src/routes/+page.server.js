import { posts } from '#lib/content.js';

export function load() {
	return { posts: posts.map(({ slug, title, description, image, date }) => ({ slug, title, description, image, date })) };
}
