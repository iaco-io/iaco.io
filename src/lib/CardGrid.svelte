<script>
	// posts and pages as a grid of cards: two columns on a phone, more on wider screens. used on the home
	// page and on tag and category pages, so they look the same
	import Tp from './Tp.svelte';
	import { focusFade } from './focusFade.js';

	/** @type {{ items: { url: string, title: string, description?: string, image?: string }[], id?: string }} */
	let { items, id } = $props();
</script>

<section {id} class="grid" use:focusFade>
	{#each items as item (item.url)}
		<a class="card glass" href={item.url}>
			{#if item.image}<img src={item.image} alt="" loading="lazy" />{/if}
			<h2><Tp text={item.title} /></h2>
			{#if item.description}<p><Tp text={item.description} /></p>{/if}
		</a>
	{/each}
</section>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(10rem, 100%), 1fr));
		gap: 0.75rem;
		scroll-margin-top: calc(var(--top) + 6rem);
	}

	@media (min-width: 640px) {
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
			gap: 1rem;
		}
	}

	.card {
		--pad: clamp(1rem, 3vw, 1.5rem);
		display: block;
		padding: var(--pad);
		border-radius: 1.5rem;
		color: var(--accent);
		transition: transform 0.2s ease;
	}

	.card:hover {
		transform: translateY(-2px);
	}

	img {
		display: block;
		width: calc(100% + 2 * var(--pad));
		margin: calc(-1 * var(--pad)) calc(-1 * var(--pad)) 0;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		border-radius: 1.5rem 1.5rem 0 0;
	}

	h2 {
		margin: 0.8rem 0 0.35rem;
		font-family: var(--title);
		font-style: italic;
		font-weight: 600;
		font-size: clamp(1.02rem, 3.2vw, 1.25rem);
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
		color: var(--fg);
	}

	h2:first-child {
		margin-top: 0;
	}

	p {
		margin: 0;
		font-size: clamp(0.88rem, 2.6vw, 1rem);
		line-height: 1.5;
		color: var(--muted);
	}
</style>
