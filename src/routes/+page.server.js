import { posts } from '#lib/content.js';

export function load() {
	return { posts: posts.map(({ url, title, description, image, date }) => ({ url, title, description, image, date })) };
}
