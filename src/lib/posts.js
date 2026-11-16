// each post is a folder: src/posts/<slug>/index.md, with its images beside it
const files = import.meta.glob('/src/posts/*/index.md', { query: '?raw', import: 'default', eager: true });
const images = import.meta.glob('/src/posts/*/*.{jpg,jpeg,png,webp,avif,gif}', {
	query: '?url',
	import: 'default',
	eager: true
});

/** reads the `key: value` lines between the --- fences at the top of a markdown file */
function frontmatter(/** @type {string} */ text) {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};
	return Object.fromEntries(
		match[1]
			.split(/\r?\n/)
			.map((line) => line.match(/^(\w+):\s*(.*)$/))
			.filter(Boolean)
			.map(([, key, value]) => [key, value.trim().replace(/^(["'])(.*)\1$/, '$2')])
	);
}

export const posts = Object.entries(files)
	.map(([path, text]) => {
		const slug = path.split('/').at(-2);
		const meta = frontmatter(/** @type {string} */ (text));
		return {
			slug,
			title: meta.title ?? slug,
			description: meta.description ?? '',
			date: meta.date ? new Date(meta.date) : null,
			image: meta.image ? images[`/src/posts/${slug}/${meta.image}`] ?? meta.image : null
		};
	})
	.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
