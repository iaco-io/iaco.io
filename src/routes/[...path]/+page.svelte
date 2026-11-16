<script>
	import { onMount } from 'svelte';
	import Entry from '#lib/Entry.svelte';

	let { data } = $props();

	onMount(() => data.redirect && location.replace(data.redirect));
</script>

<svelte:head>
	{#if data.redirect}
		<meta http-equiv="refresh" content="0; url={data.redirect}" />
		<link rel="canonical" href={data.redirect} />
	{/if}
</svelte:head>

{#if data.redirect}
	<p class="redirect">taking you to <a href={data.redirect}>{data.redirect}</a>…</p>
{:else}
	<Entry item={data.item} media={data.media} />
{/if}

<style>
	.redirect {
		padding: calc(var(--top) + 9rem) 1.5rem;
		text-align: center;
		color: var(--muted);
	}
</style>
