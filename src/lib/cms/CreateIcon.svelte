<script>
	// "new" icons: a file with + for pages, a feather with + for posts, a link with + for redirects
	import { FilePlusCorner, Feather, Link, Plus } from '@lucide/svelte';

	/** @type {{ kind: 'posts' | 'pages' | 'redirects', size?: number }} */
	let { kind, size = 22 } = $props();
</script>

{#if kind === 'pages'}
	<FilePlusCorner {size} />
{:else}
	<span class="combo">
		{#if kind === 'posts'}<Feather {size} />{:else}<Link {size} />{/if}
		<span class="plus"><Plus size={size * 0.55} strokeWidth={3} /></span>
	</span>
{/if}

<style>
	.combo {
		position: relative;
		display: inline-flex;
		/* the + pokes out bottom right, so nudge the whole group back towards the middle */
		translate: -2px -2px;
	}

	.plus {
		position: absolute;
		right: -0.3em;
		bottom: -0.1em;
		display: flex;
	}
</style>
