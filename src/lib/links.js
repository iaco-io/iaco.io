// which links leave the site: other websites, and the short links in src/redirects/ that go to them (like /youtube/).
// those open in a new tab, and in the installed app on an iphone straight in safari
const files = import.meta.glob('/src/redirects/*.md', { query: '?raw', import: 'default', eager: true });

/** every short link path ('/yt/', '/📺/'…) and where it goes, read from the redirect files */
const REDIRECTS = new Map();
for (const [path, raw] of Object.entries(files)) {
	const text = /** @type {string} */ (raw);
	const target = text.match(/^redirect:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
	if (!target || /^draft:\s*true/m.test(text)) continue;
	const name = path.slice('/src/redirects/'.length, -'.md'.length);
	const aliases = [...(text.match(/^alias:\s*\n((?:\s+-.*\n?)*)/m)?.[1] ?? '').matchAll(/^\s+-\s*(.+)$/gm)].map((m) => m[1].trim());
	for (const p of [name, ...aliases]) REDIRECTS.set(`/${p.replace(/^\/+|\/+$/g, '')}/`, target);
}

const SITE = /^https?:\/\/(www\.)?iaco\.io(\/|$)/i;

/** where a link really goes: a short link becomes its destination */
export function destination(/** @type {string} */ href) {
	let path = href;
	if (SITE.test(href)) path = href.replace(SITE, '/');
	if (!path.startsWith('/') || path.startsWith('//')) return href;
	const clean = decodeURIComponent(path.split(/[?#]/)[0]).replace(/\/*$/, '/');
	return REDIRECTS.get(clean) ?? href;
}

/** a link to another website, directly or through a short link */
export const external = (/** @type {string} */ href) => {
	const to = destination(href);
	return /^https?:\/\//i.test(to) && !SITE.test(to);
};
