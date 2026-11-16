<script>
	import { setAlphabet } from '#lib/tp.js';
	// live preview for the cms: renders an unsaved post with the real blog layout.
	// the cms sends the content through postMessage.
	import Article from '#lib/Article.svelte';

	/** @type {{ item: { title: string, description: string, image: string }, body: string, images: Record<string, string> } | null} */
	let data = $state(null);

	$effect(() => {
		/** @param {MessageEvent} e */
		const receive = (e) => {
			if (e.origin !== location.origin || e.data?.type !== 'preview') return;
			if (e.data.alphabet) setAlphabet(e.data.alphabet);
			data = e.data;
		};
		addEventListener('message', receive);
		parent.postMessage({ type: 'preview-ready' }, location.origin);
		return () => removeEventListener('message', receive);
	});
</script>

<svelte:head>
	<title>preview — iaco</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data}
	<main>
		<Article item={data.item} body={data.body} resolve={(path) => data?.images[path] ?? path} />
	</main>
{/if}

<style>
	main {
		padding: calc(var(--top) + 7rem) 1.5rem 8rem;
	}
</style>
