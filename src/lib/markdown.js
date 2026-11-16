import { Marked } from 'marked';

// properties at the top of each .md file, in this order
export const FIELDS = ['title', 'description', 'image', 'date', 'draft'];

/** splits a .md file into its `key: value` properties and its body */
export function parse(/** @type {string} */ file) {
	const match = file.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { meta: {}, body: file };
	const meta = Object.fromEntries(
		match[1]
			.split(/\r?\n/)
			.map((line) => line.match(/^(\w+):\s*(.*)$/))
			.filter(Boolean)
			.map(([, key, value]) => [key, value.trim().replace(/^(["'])(.*)\1$/, '$2')])
	);
	return { meta, body: match[2] };
}

/** @param {Record<string, any>} meta @param {string} body */
export function serialize(meta, body) {
	const lines = FIELDS.filter((key) => meta[key] !== undefined && meta[key] !== '' && meta[key] !== false).map(
		(key) => `${key}: ${String(meta[key]).replace(/\s*\n\s*/g, ' ')}`
	);
	return `---\n${lines.join('\n')}\n---\n${body.trim()}\n`;
}

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
