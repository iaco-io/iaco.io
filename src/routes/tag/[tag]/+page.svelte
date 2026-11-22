<script>
	// everything with one tag (or category): its posts newest first, then its pages
	import { Tag, BookBookmark } from '@lucide/svelte';
	import Tp from '#lib/Tp.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} — iaco.io</title>
	<meta name="description" content="{data.category ? 'category' : 'tag'}: {data.name}" />
</svelte:head>

<main>
	<header>
		<span class="kind">
			{#if data.category}<BookBookmark size={18} strokeWidth={1.75} /> category{:else}<Tag size={18} strokeWidth={1.75} /> tag{/if}
		</span>
		<h1>{data.name}</h1>
	</header>
	<ul>
		{#each data.items as item (item.url)}
			<li>
				<a class="card glass" href={item.url}>
					{#if item.image}<img src={item.image} alt="" loading="lazy" />{/if}
					<h2><Tp text={item.title} /></h2>
					{#if item.description}<p><Tp text={item.description} /></p>{/if}
				</a>
			</li>
		{/each}
	</ul>
</main>

<style>
	main {
		max-width: 42rem;
		margin: 0 auto;
		padding: calc(var(--top) + 7rem) 1.5rem 8rem;
	}

	header {
		margin-bottom: 2.5rem;
		text-align: center;
	}

	.kind {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	h1 {
		margin: 0.4rem 0 0;
		font-family: var(--title);
		font-style: italic;
		font-weight: 600;
		font-size: clamp(2.2rem, 6vw, 3.2rem);
		letter-spacing: -0.01em;
	}

	ul {
		display: grid;
		gap: 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.card {
		display: block;
		padding: 1.75rem;
		border-radius: 1.5rem;
		color: var(--accent);
		transition: transform 0.2s ease;
	}

	.card:hover {
		transform: translateY(-2px);
	}

	.card img {
		display: block;
		width: calc(100% + 3.5rem);
		margin: -1.75rem -1.75rem 0;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		border-radius: 1.5rem 1.5rem 0 0;
	}

	h2 {
		margin: 1rem 0 0.35rem;
		font-family: var(--title);
		font-style: italic;
		font-weight: 600;
		font-size: 1.25rem;
		letter-spacing: -0.02em;
		color: var(--fg);
	}

	.card img + h2 {
		margin-top: 1rem;
	}

	h2:first-child {
		margin-top: 0;
	}

	p {
		margin: 0;
		line-height: 1.5;
		color: var(--muted);
	}
</style>
