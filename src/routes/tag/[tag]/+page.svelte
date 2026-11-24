<script>
	// everything with one tag (or category): its posts newest first, then its pages
	import { Tag } from '@lucide/svelte';
	import CardGrid from '#lib/CardGrid.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.name} — iaco.io</title>
	<meta name="description" content="{data.category ? 'category' : 'tag'}: {data.name}" />
</svelte:head>

<main>
	<header>
		<h1 class="gradient-title">{data.name}</h1>
		<!-- the category's icon (a tag's for a plain tag) and how many things it holds -->
		<span class="kind" aria-label="{data.category ? 'category' : 'tag'}, {data.items.length} {data.items.length === 1 ? 'item' : 'items'}">
			{#if data.icon?.mask}<span class="icon" style:--icon="url({JSON.stringify(data.icon.src)})"></span>
			{:else if data.icon}<img class="icon" src={data.icon.src} alt="" />
			{:else}<Tag size={18} strokeWidth={1.75} />{/if}
			• {data.items.length}
		</span>
	</header>
	<CardGrid items={data.items} />
</main>

<style>
	main {
		max-width: 64rem;
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
		font-weight: 700;
		font-size: clamp(2.2rem, 6vw, 3.2rem);
		letter-spacing: -0.01em;
	}
</style>
