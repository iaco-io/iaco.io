<script>
	// everything with one tag (or category): its posts newest first, then its pages
	import { Tag } from '@lucide/svelte';
	import Tp from '#lib/Tp.svelte';
	import { focusFade } from '#lib/focusFade.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} — iaco.io</title>
	<meta name="description" content="{data.category ? 'category' : 'tag'}: {data.name}" />
</svelte:head>

<main>
	<header>
		<h1>{data.name}</h1>
		<!-- the category's icon (a tag's for a plain tag) and how many things it holds -->
		<span class="kind" aria-label="{data.category ? 'category' : 'tag'}, {data.items.length} {data.items.length === 1 ? 'item' : 'items'}">
			{#if data.icon?.mask}<span class="icon" style:--icon="url({JSON.stringify(data.icon.src)})"></span>
			{:else if data.icon}<img class="icon" src={data.icon.src} alt="" />
			{:else}<Tag size={18} strokeWidth={1.75} />{/if}
			• {data.items.length}
		</span>
	</header>
	<ul use:focusFade>
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
		margin-top: 0.6rem;
		font-size: 0.95rem;
		color: var(--muted);
	}

	.icon {
		width: 18px;
		height: 18px;
	}

	span.icon {
		background: currentColor;
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
	}

	h1 {
		margin: 0;
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
