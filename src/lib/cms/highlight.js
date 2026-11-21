// markdown drawn with its own styles, for the focus editor: the text stays exactly as typed (marks included),
// only its look changes (bold, italic, highlights, links…). it sits under the textarea, letter for letter,
// so it must never add or remove a character

const escape = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// a colour circle after == picks the highlight's colour, like on the blog
const MARKS = { '🔴': 'red', '🟠': 'orange', '🟡': 'yellow', '🟢': 'green', '🔵': 'blue', '🟣': 'purple', '⚫': 'black', '⚪': 'white', '🟤': 'brown' };

const m = (/** @type {string} */ s) => `<span class="m">${s}</span>`;

/** inline styles of one line (already escaped) */
function inline(/** @type {string} */ text) {
	// code spans first, kept as they are; the rest is styled
	return text
		.split(/(`[^`]+`)/)
		.map((part, i) => {
			if (i % 2) return `<code>${part}</code>`;
			return part
				.replace(/&lt;\/?(?:tp|al)&gt;/g, (t) => m(t))
				.replace(/(!?)\[([^\]]*)\]\(([^)\s]*)\)/g, (_, bang, label, url) =>
					bang ? m(`![${label}](${url})`) : `${m('[')}<span class="link">${label}</span>${m(`](${url})`)}`
				)
				.replace(/\*\*(?=\S)(.+?)\*\*/g, (_, t) => `<b>${m('**')}${t}${m('**')}</b>`)
				.replace(/(^|[^*\w])\*(?=[^\s*])([^*]+?)\*(?!\*)/g, (_, pre, t) => `${pre}<i>${m('*')}${t}${m('*')}</i>`)
				.replace(/(^|\W)_(?=\S)([^_]+?)_(?!\w)/g, (_, pre, t) => `${pre}<i>${m('_')}${t}${m('_')}</i>`)
				.replace(/~~(?=\S)(.+?)~~/g, (_, t) => `<s>${m('~~')}${t}${m('~~')}</s>`)
				.replace(/==(?!=)(.+?)==/g, (_, t) => {
					const c = Object.keys(MARKS).find((k) => t.startsWith(k));
					const name = c ? MARKS[/** @type {keyof typeof MARKS} */ (c)] : '';
					return `<mark${name ? ` class="${name}"` : ''}>${m('==' + (c ? t.slice(0, c.length) : ''))}${c ? t.slice(c.length) : t}${m('==')}</mark>`;
				});
		})
		.join('');
}

/** the whole text as html with styles; same characters, same lines */
export function highlight(/** @type {string} */ source) {
	let fence = false;
	const lines = source.split('\n').map((raw) => {
		const line = escape(raw);
		if (/^\s*```/.test(raw)) {
			fence = !fence;
			return `<span class="fence">${line}</span>`;
		}
		if (fence) return `<span class="code">${line}</span>`;
		let match;
		if ((match = /^(#{1,6}\s)(.*)$/.exec(line))) return `<span class="h">${m(match[1])}${inline(match[2])}</span>`;
		if ((match = /^(\s*(?:&gt;\s?)+)(.*)$/.exec(line))) return `${m(match[1])}<span class="quote">${inline(match[2])}</span>`;
		if ((match = /^(\s*(?:[-*+]|\d+\.)\s)(.*)$/.exec(line))) return `${m(match[1])}${inline(match[2])}`;
		if (/^\s*(?:_{3,}|-{3,}|\*{3,})\s*$/.test(raw)) return m(line);
		if (/^\s*\|/.test(raw)) return line.replace(/\|/g, m('|'));
		return inline(line);
	});
	// a last empty line still takes a line, as in the textarea
	return lines.join('\n') + '\n ';
}
