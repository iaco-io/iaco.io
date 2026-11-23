<script>
	// unknown urls go to the home page. errors (like data from an older version, right after an update) go back
	// to the start, the home page or the cms's, which then says "please try again"; if the start itself fails
	// right away, this says so instead of going round in circles. waits a tick: on a link inside the site, the
	// address bar changes to the new url only after this page is shown, and replacing earlier would reload the old one
	import { page } from '$app/state';

	let stuck = $state(false);

	$effect(() => {
		if (page.status === 404) return void setTimeout(() => location.replace('/'));
		let last = 0;
		try {
			last = Number(sessionStorage.getItem('try-again'));
		} catch {}
		if (Date.now() - last < 15_000) return void (stuck = true);
		try {
			sessionStorage.setItem('try-again', String(Date.now()));
		} catch {}
		const start = page.url.pathname.startsWith('/cms') ? '/cms/' : '/';
		setTimeout(() => location.replace(start));
	});
</script>

<main>
	<p role="status">{page.status === 404 ? 'taking you home…' : stuck ? 'something went wrong. please try again in a moment.' : 'one moment…'}</p>
</main>

<style>
	p {
		padding: calc(var(--top) + 9rem) 1.5rem;
		text-align: center;
		color: var(--muted);
	}
</style>
