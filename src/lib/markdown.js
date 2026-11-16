import { Marked } from 'marked';

// properties at the top of each .md file, in this order
export const FIELDS = ['title', 'description', 'image', 'date', 'draft', 'alias', 'redirect'];

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
	const meta = Object.fromEntries(
		match[1]
			.split(/\r?\n/)
			.map((line) => line.match(/^(\w+):\s*(.*)$/))
			.filter(Boolean)
			.map(([, key, raw]) => [key, value(raw)])
	);
	return { meta, body: match[2] };
}

/** @param {Record<string, any>} meta @param {string} body */
export function serialize(meta, body) {
	const format = (/** @type {any} */ v) =>
		Array.isArray(v) ? `[${v.map((x) => `'${x}'`).join(', ')}]` : String(v).replace(/\s*\n\s*/g, ' ');
	const lines = FIELDS.filter((key) => {
		const v = meta[key];
		return v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length);
	}).map((key) => `${key}: ${format(meta[key])}`);
	return `---\n${lines.join('\n')}\n---\n${body.trim()}\n`;
}

/** file name to urls: `001-my-intro` is /post/my-intro/ and /001/, `test` is just /post/test/ */
export function urls(/** @type {'posts' | 'pages' | 'redirects'} */ kind, /** @type {string} */ name) {
	const [, id, rest] = name.match(/^(\d+)-(.+)$/) ?? [];
	const slug = rest ?? name;
	return { slug, id: id ?? '', url: kind === 'posts' ? `/post/${slug}/` : `/${slug}/` };
}

/** '/ig' or 'ig/' becomes '/ig/' */
export const normalize = (/** @type {string} */ path) => `/${path.replace(/^\/+|\/+$/g, '')}/`;

/**
 * markdown to html; relative image and link paths go through `resolve`
 * @param {string} source @param {(path: string) => string} resolve
 */
export function render(source, resolve = (path) => path) {
	const marked = new Marked({
		walkTokens(token) {
			if ((token.type === 'image' || token.type === 'link') && !/^([a-z]+:|\/|#)/i.test(token.href)) {
				token.href = resolve(token.href);
			}
		}
	});
	return /** @type {string} */ (marked.parse(source, { async: false }));
}
