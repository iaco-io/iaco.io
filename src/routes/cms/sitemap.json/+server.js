// every link on the site (at /cms/sitemap.json), for the cms login's site map (three taps on its feather): pages, posts, redirects
// and tags, each with the other addresses that lead to it. encrypted, like the posts' and pages' text
import { json } from '@sveltejs/kit';
import { encrypt } from '#lib/crypto.js';
import { plain } from '#lib/tp.js';
import { pages, posts, redirects } from '#lib/content.js';
import { savedCategories, tagName, tagUrl } from '#lib/tags.js';

export const prerender = true;

/** @param {typeof pages[number]} item */
const entry = (item) => ({
	title: plain(item.title).toLowerCase(),
	url: item.url,
	aliases: item.paths.filter((p) => p !== item.url),
	...(item.unlisted && { unlisted: true }),
	...(item.featured && { featured: true })
});

export async function GET() {
	const tags = [...new Set([...pages, ...posts].flatMap((i) => i.tags))].sort();
	const map = {
		pages: pages.toSorted((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })).map(entry),
		posts: posts.map(entry),
		links: redirects.map((r) => ({ title: r.slug, url: r.url, aliases: r.paths.filter((p) => p !== r.url), to: r.redirect })),
		tags: tags.map((t) => ({ title: tagName(t), url: tagUrl(t), aliases: [], ...(savedCategories.includes(t) && { category: true }) }))
	};
	return json({ map: await encrypt(JSON.stringify(map)) });
}
