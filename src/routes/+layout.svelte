<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { Waves, Newspaper } from '@lucide/svelte';
	import Menu from '#lib/Menu.svelte';
	import Fabs from '#lib/Fabs.svelte';
	import { page } from '$app/state';

	/** @type {{ children: import('svelte').Snippet, data: { pages: { url: string, title: string }[] } }} */
	let { children, data } = $props();

	const links = $derived([
		{ href: '/', label: 'iaco.io', icon: Waves },
		{ href: '/#latest', label: 'latest', icon: Newspaper },
		...data.pages.map((p) => ({ href: p.url, label: p.title }))
	]);

	let open = $state(false);
	// the cms has its own interface
	const cms = $derived(page.url.pathname.startsWith('/cms'));

	// safari ignores user-scalable=no, so block pinch zoom directly
	onMount(() => {
		const block = (/** @type {Event} */ e) => e.preventDefault();
		document.addEventListener('gesturestart', block);
		return () => document.removeEventListener('gesturestart', block);
	});
</script>


<div class="statusbar glass" aria-hidden="true"></div>

{#if !cms}
	<header>
		<a class="logo" href="/">iaco</a>
	</header>
{/if}

{@render children()}

{#if !cms}
	<Fabs onmenu={() => (open = true)} />
	<Menu bind:open {links} />
{/if}

<style>
	/* only in the installed app: in safari a fixed bar at the edge makes it paint a solid toolbar */
	.statusbar {
		display: none;
		position: fixed;
		inset: 0 0 auto;
		z-index: 10;
		height: var(--top);
		border: 0;
	}

	@media (display-mode: standalone) {
		.statusbar {
			display: block;
		}
	}

	header {
		position: absolute;
		top: calc(var(--top) + var(--gap));
		left: var(--gap);
		z-index: 5;
		height: 3rem;
		display: flex;
		align-items: center;
	}

	.logo {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--fg);
	}
</style>
