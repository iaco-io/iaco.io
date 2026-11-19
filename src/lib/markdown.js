import { external } from './links.js';
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

// ==highlighted== text; a colour circle right after the == picks the colour: ==🟢like this==
const MARKS = { '🔴': 'red', '🟠': 'orange', '🟡': 'yellow', '🟢': 'green', '🔵': 'blue', '🟣': 'purple', '⚫': 'black', '⚪': 'white', '🟤': 'brown' };
const highlight = {
	name: 'highlight',
	level: /** @type {const} */ ('inline'),
	start: (/** @type {string} */ src) => src.indexOf('=='),
	/** @param {string} src */
	tokenizer(src) {
		const match = /^==(?!=)([\s\S]+?)==/.exec(src);
		if (!match) return;
		let text = match[1];
		const colour = Object.keys(MARKS).find((c) => text.startsWith(c));
		if (colour) text = text.slice(colour.length).replace(/^️/, '');
		return {
			type: 'highlight',
			raw: match[0],
			colour: colour ? MARKS[/** @type {keyof typeof MARKS} */ (colour)] : '',
			tokens: /** @type {any} */ (this).lexer.inlineTokens(text)
		};
	},
	/** @param {any} token */
	renderer(token) {
		return `<mark${token.colour ? ` class="${token.colour}"` : ''}>${/** @type {any} */ (this).parser.parseInline(token.tokens)}</mark>`;
	}
};

// links to other websites (and short links to them, like /youtube/) open in a new tab
const newTabs = (/** @type {string} */ html) =>
	html.replace(/<a\s([^>]*?)href="([^"]*)"([^>]*)>/g, (tag, before, href, after) =>
		external(href) && !/\starget=/.test(before + after) ? `<a ${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">` : tag
	);

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const LINK_LINE = /^\[\]\(([^)\s]+)\)$/;
const escape = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * ```grid … ``` : cards that fill the width, 2–3 a row on phones. cards are split by a line of ___.
 * in a card's first two lines, an image (or icon) is the card's picture and an empty link [](…) makes the whole
 * card open it. a card that is only a picture is all picture
 * @param {string} source @param {(path: string) => string} resolve
 * @param {(md: string) => string} inner @param {(md: string) => string} inlineOf
 */
function grid(source, resolve, inner, inlineOf) {
	const cards = source.split(/^\s*_{3,}\s*$/m).map((c) => c.trim()).filter(Boolean);
	return `<div class="grid">${cards
		.map((card) => {
			const lines = card.split('\n');
			let image = '';
			let link = '';
			for (let i = 0; i < 2 && lines.length; i++) {
				const line = lines[0].trim();
				const img = !image && IMAGE_LINE.exec(line);
				const lnk = !link && LINK_LINE.exec(line);
				if (img) image = img[2];
				else if (lnk) link = lnk[1];
				else break;
				lines.shift();
			}
			// the first line of text is the card's title, the rest its text
			const [title = '', ...rest] = lines.join('\n').trim().split('\n');
			const body = rest.join('\n').trim();
			const text = title.trim()
				? `<p class="card-title">${inlineOf(title)}</p>${body ? inner(body) : ''}`
				: '';
			let picture = '';
			if (image) {
				const local = !/^([a-z]+:|\/)/i.test(image);
				picture = local && ICONS[image]
					? `<span class="card-icon">${ICONS[image].replace('<svg', '<svg class="icon" aria-hidden="true"')}</span>`
					: `<img src="${escape(local ? resolve(image) : image)}" alt="" loading="lazy" />`;
			}
			const href = link && !/^([a-z]+:|\/|#)/i.test(link) ? resolve(link) : link;
			const tag = href ? 'a' : 'div';
			const attrs = href ? ` href="${escape(href)}"${external(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}` : '';
			const only = picture && !text ? ' only' : '';
			const kind = image && ICONS[image] ? ' with-icon' : '';
			return `<${tag} class="card${only}${kind}"${attrs}>${picture}${text ? `<div class="card-text">${text}</div>` : ''}</${tag}>`;
		})
		.join('')}</div>`;
}

/**
 * markdown to html; relative image and link paths go through `resolve`
 * @param {string} source @param {(path: string) => string} resolve
 */
export function render(source, resolve = (path) => path) {
	const marked = new Marked({
		// a line break in the text is a line break on the page
		breaks: true,
		extensions: [highlight],
		walkTokens(token) {
			if ((token.type === 'image' || token.type === 'link') && !/^([a-z]+:|\/|#)/i.test(token.href)) {
				// a one-colour svg from the media folder (like icons/youtube.svg) goes in as the icon itself
				token.href = token.type === 'image' && ICONS[token.href] ? `icon:${token.href}` : resolve(token.href);
			}
		},
		renderer: {
			code({ text, lang }) {
				if (lang?.trim() !== 'grid') return false;
				return grid(
					text,
					resolve,
					(md) => /** @type {string} */ (marked.parse(md, { async: false })),
					(md) => /** @type {string} */ (marked.parseInline(md, { async: false }))
				);
			},
			image({ href, text }) {
				if (!href.startsWith('icon:')) return false;
				const label = text ? ` role="img" aria-label="${text.replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
				return ICONS[href.slice(5)].replace('<svg', `<svg class="icon"${label}`);
			}
		}
	});
	return newTabs(/** @type {string} */ (marked.parse(withAlphabet(source), { async: false })));
}
