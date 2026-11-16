<script>
	// a decrypted post or page, used by /posts/<slug>/ and /<slug>/
	import { decrypt } from './crypto.js';
	import Article from './Article.svelte';

	/**
	 * @type {{
	 *   item: { title: string, description: string, image: string, date: string, body: string },
	 *   media: Record<string, string>
	 * }}
	 */
	let { item, media } = $props();

	let body = $state(/** @type {string | null} */ (null));

	$effect(() => {
		body = null;
		const current = item;
		decrypt(current.body)
			.then((plain) => current === item && (body = plain))
			.catch(() => (body = '_could not decrypt this post._'));
	});
</script>

<svelte:head>
	<title>{item.title} — iaco</title>
	<meta name="description" content={item.description} />
</svelte:head>

<main>
	<Article {item} {body} resolve={(path) => media[path] ?? path} />
</main>

<style>
	main {
		padding: calc(var(--top) + 7rem) 1.5rem 8rem;
	}
</style>
