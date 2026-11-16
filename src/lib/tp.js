// special text in titles and posts:
// <tp>…</tp> toki pona, shown in sitelen pona (the linja sike font turns words into glyphs)
// <al>…</al> iaco's own alphabet: some letters are swapped for special ones (y is ị, w is ụ)

const ALPHABET = { a: 'ɑ', f: 'ƒ', j: 'ȷ', l: 'ɭ', n: 'ƞ', r: 'ɾ', s: 'ʃ', t: 'ʈ', y: 'ị', w: 'ụ' };

/** writes text in iaco's alphabet */
export const alphabet = (/** @type {string} */ text) =>
	text.toLowerCase().replace(/[afjlnrstyw]/g, (c) => ALPHABET[/** @type {keyof typeof ALPHABET} */ (c)]);

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
