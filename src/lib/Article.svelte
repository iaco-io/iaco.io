<script>
	import Tp from './Tp.svelte';
	import { Tag, BookBookmark } from '@lucide/svelte';
	import { savedCategories, tagUrl, cleanTag, tagName } from './tags.js';
	import { render } from './markdown.js';

	/**
	 * @type {{
	 *   item: { title: string, description: string, image: string, tags?: string[] },
	 *   body: string | null,
	 *   resolve?: (path: string) => string
	 * }}
	 */
	let { item, body, resolve = (path) => path } = $props();

	const html = $derived(body === null ? '' : render(body, resolve));
</script>

<article>
	<header>
		<h1><Tp text={item.title} /></h1>
		{#if item.description}<p class="lead"><Tp text={item.description} /></p>{/if}
		{#if item.tags?.length}
			<!-- tags link to their pages; categories show a bookmark -->
			<ul class="tags" aria-label="tags">
				{#each item.tags.map(cleanTag).filter(Boolean) as tag (tag)}
					<li>
						<a href={tagUrl(tag)}>
							{#if savedCategories.includes(tag)}<BookBookmark size={14} strokeWidth={1.75} />{:else}<Tag size={14} strokeWidth={1.75} />{/if}
							{tagName(tag)}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</header>
	{#if item.image}<img class="cover" src={resolve(item.image)} alt="" />{/if}
	<div class="prose">
		{#if body === null}<p class="loading">…</p>{:else}{@html html}{/if}
	</div>
</article>

<style>
	article {
		max-width: 42rem;
		margin: 0 auto;
	}

	header {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	h1 {
		margin: 0;
		font-family: var(--title);
		font-style: italic;
		font-weight: 600;
		font-size: clamp(2.4rem, 6vw, 3.6rem);
		line-height: 1.06;
		letter-spacing: -0.01em;
	}

	.lead {
		margin: 1rem 0 0;
		font-family: var(--title);
		font-style: italic;
		font-size: 1.35rem;
		line-height: 1.45;
		color: var(--muted);
	}

	.cover {
		display: block;
		width: 100%;
		margin-bottom: 2.5rem;
		border-radius: 1.5rem;
		box-shadow: 0 10px 40px var(--shadow);
	}

	.prose {
		font-size: 1.125rem;
		line-height: 1.7;
	}

	.prose :global(h2),
	.prose :global(h3) {
		margin: 2.2em 0 0.6em;
		font-family: var(--title);
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem 0.9rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}

	.tags a {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.prose :global(img) {
		max-width: 100%;
		border-radius: 1rem;
	}

	/* ==highlights==: a soft marker stroke; a colour circle picks the colour */
	.prose :global(mark) {
		--mark: rgb(255 214 102 / 0.55);
		padding: 0.05em 0.2em;
		border-radius: 0.3em;
		color: inherit;
		background: var(--mark);
		-webkit-box-decoration-break: clone;
		box-decoration-break: clone;
	}

	.prose :global(mark.red) { --mark: rgb(255 107 107 / 0.42); }
	.prose :global(mark.orange) { --mark: rgb(255 159 67 / 0.45); }
	.prose :global(mark.yellow) { --mark: rgb(255 214 102 / 0.55); }
	.prose :global(mark.green) { --mark: rgb(102 204 136 / 0.42); }
	.prose :global(mark.blue) { --mark: rgb(95 143 230 / 0.4); }
	.prose :global(mark.purple) { --mark: rgb(170 120 230 / 0.4); }
	.prose :global(mark.black) { --mark: rgb(20 20 30 / 0.85); color: #f4ecdc; }
	.prose :global(mark.white) { --mark: rgb(255 255 255 / 0.9); color: #0b1f38; }
	.prose :global(mark.brown) { --mark: rgb(165 110 70 / 0.42); }

	/* ```grid``` blocks: cards that fill the width, 2–3 a row on a phone */
	.prose :global(.grid) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(9.5rem, 40%), 1fr));
		gap: 0.75rem;
		margin: 1.5rem 0;
	}

	.prose :global(.grid .card) {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--glass-edge);
		border-radius: 1.1rem;
		color: inherit;
		text-decoration: none;
		background: var(--glass);
		transition: transform 0.2s ease;
	}

	.prose :global(a.card:hover) {
		transform: translateY(-2px);
	}

	/* card pictures (and icons) have the shape of a youtube preview (16:9), filled and cut to fit */
	.prose :global(.grid .card > img) {
		display: block;
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 0;
	}

	.prose :global(.grid .card-icon) {
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9; /* the same shape as the pictures */
		background: var(--panel);
	}

	/* lucide icons: the svg file is used as a stencil, filled with the text's colour */
	.prose :global(span.icon.lucide) {
		display: inline-block;
		width: 1.15em;
		height: 1.15em;
		vertical-align: -0.2em;
		background: currentColor;
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
	}

	.prose :global(.grid .card-icon .icon.lucide),
		.prose :global(.grid .card-icon svg.icon) {
		width: 45%;
		height: 45%;
		vertical-align: 0;
	}

	.prose :global(.grid .card.only .card-icon) {
		height: 100%;
	}

	.prose :global(.grid .card-text) {
		padding: 0.6rem 0.8rem 0.75rem;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.prose :global(.grid .card-title) {
		margin: 0 0 0.2rem;
		font-weight: 400;
	}

	.prose :global(.grid .card-text > :last-child) {
		margin-bottom: 0;
	}

	.prose :global(.grid .card-text p) {
		margin: 0.3rem 0;
	}

		/* a table whose header cells are all empty has no header (markdown always needs one) */
	.prose :global(thead:not(:has(th:not(:empty)))) {
		display: none;
	}

	/* icons from the media folder sit in the text like a letter, in its colour */
	.prose :global(svg.icon) {
		display: inline-block;
		width: 1.15em;
		height: 1.15em;
		vertical-align: -0.2em;
	}

	.prose :global(a) {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.prose :global(blockquote) {
		margin: 1.5em 0;
		padding: 0.2em 1.2em;
		border-left: 3px solid var(--soft);
		color: var(--muted);
	}

	.prose :global(code) {
		padding: 0.1em 0.35em;
		border-radius: 0.4em;
		font-size: 0.9em;
		background: var(--glass);
	}

	.prose :global(pre) {
		overflow-x: auto;
		padding: 1rem 1.2rem;
		border-radius: 1rem;
		background: var(--glass);
	}

	.prose :global(pre code) {
		padding: 0;
		background: none;
	}

	.prose :global(hr) {
		margin: 2.5em auto;
		width: 30%;
		border: 0;
		border-top: 1px solid var(--muted);
	}

	.loading {
		text-align: center;
		color: var(--muted);
	}
</style>
