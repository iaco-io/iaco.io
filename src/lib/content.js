// build-time only: reads src/posts/*.md and src/pages/*.md, images from src/media/
import { parse, urls, normalize } from './markdown.js';

const files = import.meta.glob(['/src/posts/*.md', '/src/pages/*.md', '!**/README.md'], {
	query: '?raw',
	import: 'default',
	eager: true
});

/** image name to built url */
export const media = Object.fromEntries(
	Object.entries(import.meta.glob('/src/media/*', { query: '?url', import: 'default', eager: true })).map(
		([path, url]) => [path.slice('/src/media/'.length), /** @type {string} */ (url)]
	)
);

/** @param {'posts' | 'pages'} kind */
function load(kind) {
	return Object.entries(files)
		.filter(([path]) => path.startsWith(`/src/${kind}/`))
		.map(([path, file]) => {
			const name = path.slice(`/src/${kind}/`.length, -'.md'.length);
			const { meta, body } = parse(/** @type {string} */ (file));
			const { slug, id, url } = urls(kind, name);
			const alias = [meta.alias ?? []].flat().map(normalize);
			return {
				kind,
				slug,
				url,
				// every url that leads here: the main one, the number and the aliases
				paths: [url, ...(id ? [`/${id}/`] : []), ...alias],
				title: meta.title || slug,
				description: meta.description ?? '',
				image: meta.image ? (media[meta.image] ?? meta.image) : '',
				date: meta.date ?? '',
				redirect: meta.redirect ?? '',
				draft: meta.draft === 'true',
				body
			};
		})
		.filter((item) => !item.draft)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export const posts = load('posts');
export const pages = load('pages');

const reserved = ['/cms/', '/rss.xml/', '/post/', '/_app/'];

/** every url on the site, pointing at its post or page */
export const routes = new Map();
for (const item of [...pages, ...posts]) {
	for (const path of item.paths) {
		if (reserved.some((r) => path === r || (r !== '/post/' && path.startsWith(r)))) {
			throw new Error(`${item.kind}/${item.slug}: ${path} is reserved`);
		}
		const other = routes.get(path);
		if (other) throw new Error(`${path} is used by both ${other.kind}/${other.slug} and ${item.kind}/${item.slug}`);
		routes.set(path, item);
	}
}
