<script>
	// unknown urls go to the home page
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	onMount(() => page.status === 404 && goto('/', { replaceState: true }));
</script>

<main><p role="status">{page.status === 404 ? 'taking you home…' : page.error?.message}</p></main>

<style>
	p {
		padding: calc(var(--top) + 9rem) 1.5rem;
		text-align: center;
		color: var(--muted);
	}
</style>
