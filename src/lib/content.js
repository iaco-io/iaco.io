import { cleanTag } from './tags.js';
// build-time only: reads src/{posts,pages,redirects}/*.md, images from src/media/
import { parse, urls, normalize, isIcon } from './markdown.js';

const files = import.meta.glob(['/src/posts/*.md', '/src/pages/*.md', '/src/redirects/*.md', '!**/README.md'], {
	query: '?raw',
	import: 'default',
	eager: true
});

/** image name to built url */
export const media = Object.fromEntries(
	Object.entries(import.meta.glob(['/src/media/**/*', '!**/*.md'], { query: '?url', import: 'default', eager: true })).map(
		([path, url]) => [path.slice('/src/media/'.length), /** @type {string} */ (url)]
	)
);

/** @param {'posts' | 'pages' | 'redirects'} kind */
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
				name,
				slug,
				url,
				// every url that leads here: the main one, the number and the aliases
				paths: [url, ...(id ? [`/${id}/`] : []), ...alias],
				title: meta.title || slug,
				description: meta.description ?? '',
				image: meta.image ? (media[meta.image] ?? meta.image) : '',
				date: meta.date ?? '', // only used by the rss feed
				redirect: meta.redirect ?? '',
				// tags sort posts and pages into topics; some tags are categories (src/categories.json)
				tags: [...new Set([meta.tags ?? []].flat().map(cleanTag).filter(Boolean))],
				draft: meta.draft === 'true',
				// unlisted pages stay off the menu (they still open by their address)
				unlisted: meta.unlisted === 'true',
				// featured posts: marked in the cms (posts only)
				featured: meta.featured === 'true',
				// a page's icon in the menu: lucide/name or a file from the media folder
				icon: meta.icon || 'lucide/circle-chevron-right',
				body
			};
		})
		.filter((item) => !item.draft)
		// newest first by file name: 002-… before 001-…
		.sort((a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }));
}

export const posts = load('posts');
export const pages = load('pages');
// short links like /youtube/, they only redirect
export const redirects = load('redirects').filter((item) => item.redirect);

const reserved = ['/cms/', '/preview/', '/rss.xml/', '/post/', '/_app/'];

/** every url on the site, pointing at its post or page */
export const routes = new Map();
for (const item of [...pages, ...posts, ...redirects]) {
	for (const path of item.paths) {
		if (reserved.some((r) => path === r || (r !== '/post/' && path.startsWith(r)))) {
			throw new Error(`${item.kind}/${item.slug}: ${path} is reserved`);
		}
		const other = routes.get(path);
		if (other) throw new Error(`${path} is used by both ${other.kind}/${other.slug} and ${item.kind}/${item.slug}`);
		routes.set(path, item);
	}
}

/**
 * how a page's icon is drawn in the menu: lucide icons and one-colour svgs as a stencil in the text colour
 * (mask), other pictures as they are
 * @param {string} icon
 */
export function menuIcon(icon) {
	const lucide = icon.match(/^lucide\/([a-z0-9-]+)$/);
	if (lucide) return { src: `/lucide/${lucide[1]}.svg`, mask: true };
	return { src: media[icon] ?? icon, mask: isIcon(icon) };
}
