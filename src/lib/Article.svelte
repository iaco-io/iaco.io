<script>
	import Tp from './Tp.svelte';
	import { render } from './markdown.js';

	/**
	 * @type {{
	 *   item: { title: string, description: string, image: string },
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
		font-size: clamp(2.2rem, 6vw, 3.6rem);
		line-height: 1.06;
		letter-spacing: -0.01em;
	}

	.lead {
		margin: 1rem 0 0;
		font-family: var(--serif);
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

	.prose :global(img) {
		max-width: 100%;
		border-radius: 1rem;
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
