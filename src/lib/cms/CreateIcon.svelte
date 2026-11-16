<script>
	// "new" icons: a file with + for pages, a pen with + for posts, a link with + for redirects
	import { FilePlusCorner, PenLine, Link2, Plus } from '@lucide/svelte';

	/** @type {{ kind: 'posts' | 'pages' | 'redirects', size?: number }} */
	let { kind, size = 22 } = $props();
</script>

{#if kind === 'pages'}
	<FilePlusCorner {size} />
{:else}
	<span class="combo">
		{#if kind === 'posts'}<PenLine {size} />{:else}<Link2 {size} />{/if}
		<span class="plus"><Plus size={size * 0.55} strokeWidth={3} /></span>
	</span>
{/if}

<style>
	.combo {
		position: relative;
		display: inline-flex;
	}

	.plus {
		position: absolute;
		top: -0.35em;
		right: -0.45em;
		display: flex;
	}
</style>
