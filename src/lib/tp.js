// special text in titles and posts:
// <tp>…</tp> toki pona, shown in sitelen pona (the linja sike font turns words into glyphs)
// <al>…</al> iaco's own alphabet: some letters are swapped for special ones (see src/alphabet.json)

import saved from '../alphabet.json';

/** @typedef {Record<string, { to: string, on: boolean }>} Alphabet */

// which letter becomes which (edited in the cms, kept in src/alphabet.json)
/** @type {Record<string, string>} */
let swaps = {};

/** uses another alphabet setup, e.g. the one being edited in the cms */
export function setAlphabet(/** @type {Alphabet} */ setup) {
	swaps = Object.fromEntries(Object.entries(setup).filter(([, v]) => v.on && v.to).map(([k, v]) => [k, v.to]));
}
setAlphabet(saved);

/** writes text in iaco's alphabet */
export const alphabet = (/** @type {string} */ text) => [...text.toLowerCase()].map((c) => swaps[c] ?? c).join('');

/** splits text into plain, toki pona and alphabet parts */
export const tpParts = (/** @type {string} */ text) =>
	text
		.split(/(<tp>[\s\S]*?<\/tp>|<al>[\s\S]*?<\/al>)/)
		.filter(Boolean)
		.map((part) => {
			const tag = part.match(/^<(tp|al)>([\s\S]*)<\/\1>$/);
			if (!tag) return { kind: '', text: part };
			return { kind: tag[1], text: tag[1] === 'al' ? alphabet(tag[2]) : tag[2] };
		});

/** <al> parts turned into the alphabet, keeping the tags (for markdown, before it is rendered) */
export const withAlphabet = (/** @type {string} */ text) =>
	text.replace(/<al>([\s\S]*?)<\/al>/g, (_, inner) => `<al>${alphabet(inner)}</al>`);

/** the text without tags (alphabet applied), for page titles, meta and rss */
export const plain = (/** @type {string} */ text) => withAlphabet(text).replace(/<\/?(tp|al)>/g, '');
