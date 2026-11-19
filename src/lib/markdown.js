import { withAlphabet } from './tp.js';
import { Marked } from 'marked';

// properties at the top of each .md file, in this order
export const FIELDS = ['title', 'description', 'image', 'date', 'draft', 'redirect', 'alias', 'tags'];

const QUOTES = /^["'‘’“”](.*)["'‘’“”]$/;
const unquote = (/** @type {string} */ value) => value.trim().replace(QUOTES, '$1').trim();

/** `[a, 'b']` becomes a list, anything else a string */
function value(/** @type {string} */ raw) {
	const v = raw.trim();
	if (v.startsWith('[') && v.endsWith(']')) {
		return v.slice(1, -1).split(',').map(unquote).filter(Boolean);
	}
	return unquote(v);
}

/** splits a .md file into its `key: value` properties and its body */
export function parse(/** @type {string} */ file) {
	const match = file.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { meta: {}, body: file };
	/** @type {Record<string, any>} */
	const meta = {};
	/** @type {string | null} */
	let list = null;
	for (const line of match[1].split(/\r?\n/)) {
		const item = line.match(/^\s+-\s*(.*)$/);
		if (item && list) {
			// yaml list item under the previous key: "  - /ig"
			meta[list].push(unquote(item[1]));
			continue;
		}
		const pair = line.match(/^(\w+):\s*(.*)$/);
		if (!pair) continue;
		const [, key, raw] = pair;
		list = raw.trim() ? null : key;
		meta[key] = list ? [] : value(raw);
	}
	return { meta, body: match[2] };
}

/** @param {Record<string, any>} meta @param {string} body */
export function serialize(meta, body) {
	const format = (/** @type {string} */ key, /** @type {any} */ v) =>
		Array.isArray(v)
			? `${key}:\n${v.map((x) => `  - ${x}`).join('\n')}`
			: `${key}: ${String(v).replace(/\s*\n\s*/g, ' ')}`;
	const lines = FIELDS.filter((key) => {
		const v = meta[key];
		return v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length);
	}).map((key) => format(key, meta[key]));
	return `---\n${lines.join('\n')}\n---\n${body.trim() ? `${body.trim()}\n` : ''}`;
}

/** file name to urls: `001-my-intro` is /post/my-intro/ and /001/, `test` is just /post/test/ */
export function urls(/** @type {'posts' | 'pages' | 'redirects'} */ kind, /** @type {string} */ name) {
	const [, id, rest] = name.match(/^(\d+)-(.+)$/) ?? [];
	const slug = rest ?? name;
	return { slug, id: id ?? '', url: kind === 'posts' ? `/post/${slug}/` : `/${slug}/` };
}

/** '/ig' or 'ig/' becomes '/ig/' */
export const normalize = (/** @type {string} */ path) => `/${path.replace(/^\/+|\/+$/g, '')}/`;

// svgs in the media folder drawn in one colour (stroke or fill "currentColor") are put inline in the text,
// so they take the text's size and colour, light or dark
const ICONS = Object.fromEntries(
	Object.entries(import.meta.glob('/src/media/**/*.svg', { query: '?raw', import: 'default', eager: true }))
		.filter(([, svg]) => /currentColor/.test(/** @type {string} */ (svg)))
		.map(([path, svg]) => [path.slice('/src/media/'.length), /** @type {string} */ (svg).trim()])
);

/**
 * markdown to html; relative image and link paths go through `resolve`
 * @param {string} source @param {(path: string) => string} resolve
 */
export function render(source, resolve = (path) => path) {
	const marked = new Marked({
		walkTokens(token) {
			if ((token.type === 'image' || token.type === 'link') && !/^([a-z]+:|\/|#)/i.test(token.href)) {
				// a one-colour svg from the media folder (like icons/youtube.svg) goes in as the icon itself
				token.href = token.type === 'image' && ICONS[token.href] ? `icon:${token.href}` : resolve(token.href);
			}
		},
		renderer: {
			image({ href, text }) {
				if (!href.startsWith('icon:')) return false;
				const label = text ? ` role="img" aria-label="${text.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
				return ICONS[href.slice(5)].replace('<svg', `<svg class="icon"${label}`);
			}
		}
	});
	return /** @type {string} */ (marked.parse(withAlphabet(source), { async: false }));
}
