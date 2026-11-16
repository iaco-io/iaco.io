import { posts } from '#lib/content.js';

export const prerender = true;

const site = 'https://iaco.io';

const escape = (/** @type {string} */ s) =>
	s.replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]};`);

const absolute = (/** @type {string} */ url) => new URL(url, site).href;

export function GET() {
	const items = posts
		.map((post) => {
			const link = absolute(post.url);
			const image = post.image && absolute(post.image);
			const html = `${image ? `<img src="${image}" alt="" />` : ''}<p>${escape(post.description)}</p>`;
			return `
		<item>
			<title>${escape(post.title)}</title>
			<link>${link}</link>
			<guid>${link}</guid>
			${post.date ? `<pubDate>${new Date(post.date).toUTCString()}</pubDate>` : ''}
			<description><![CDATA[${html}]]></description>
			${image ? `<media:content url="${image}" medium="image" />` : ''}
		</item>`;
		})
		.join('');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
	<channel>
		<title>iaco</title>
		<link>${site}/</link>
		<description>a blog on wellness and digital lifestyle.</description>
		<language>en</language>
		<atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />${items}
	</channel>
</rss>`;

	return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
