<script>
	import Tp from './Tp.svelte';
	import { Tag, BookBookmark } from '@lucide/svelte';
	import { savedCategories, tagUrl, cleanTag } from './tags.js';
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
			<ul class="tags">
				{#each item.tags.map(cleanTag).filter(Boolean) as tag (tag)}
					<li>
						<a href={tagUrl(tag)}>
							{#if savedCategories.includes(tag)}<BookBookmark size={14} strokeWidth={1.75} />{:else}<Tag size={14} strokeWidth={1.75} />{/if}
							{tag}
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
