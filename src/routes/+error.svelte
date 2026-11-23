<script>
	// unknown urls go to the home page. waits a tick: on a link inside the site, the address bar changes
	// to the unknown url only after this page is shown, and replacing earlier would just reload the old page
	import { page } from '$app/state';

	$effect(() => {
		if (page.status === 404) setTimeout(() => location.replace('/'));
	});
</script>

<main><p role="status">{page.status === 404 ? 'taking you home…' : page.error?.message}</p></main>

<style>
	p {
		padding: calc(var(--top) + 9rem) 1.5rem;
		text-align: center;
		color: var(--muted);
	}
</style>
