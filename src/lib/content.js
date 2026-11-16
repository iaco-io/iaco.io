// build-time only: reads posts and pages from src/{posts,pages}/<slug>/index.md
import { parse } from './markdown.js';

const files = import.meta.glob(['/src/posts/*/index.md', '/src/pages/*/index.md'], {
	query: '?raw',
	import: 'default',
	eager: true
});
const assets = import.meta.glob(['/src/posts/*/*.*', '/src/pages/*/*.*', '!**/*.md'], {
	query: '?url',
	import: 'default',
	eager: true
});

/** @param {'posts' | 'pages'} kind */
function load(kind) {
	return Object.entries(files)
		.filter(([path]) => path.startsWith(`/src/${kind}/`))
		.map(([path, file]) => {
			const folder = path.slice(0, -'index.md'.length);
			const slug = folder.split('/').at(-2);
			const { meta, body } = parse(/** @type {string} */ (file));
			/** @type {Record<string, string>} */
			const files = Object.fromEntries(
				Object.entries(assets)
					.filter(([asset]) => asset.startsWith(folder))
					.map(([asset, url]) => [asset.slice(folder.length), /** @type {string} */ (url)])
			);
			return {
				slug,
				title: meta.title ?? slug,
				description: meta.description ?? '',
				image: meta.image ? (files[meta.image] ?? meta.image) : '',
				date: meta.date ?? '',
				draft: meta.draft === 'true',
				body,
				files
			};
		})
		.filter((item) => !item.draft)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export const posts = load('posts');
export const pages = load('pages');
