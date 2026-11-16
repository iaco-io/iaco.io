<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { Waves } from '@lucide/svelte';
	import Menu from '#lib/Menu.svelte';
	import Fabs from '#lib/Fabs.svelte';
	import { page } from '$app/state';

	/** @type {{ children: import('svelte').Snippet, data: { pages: { url: string, title: string }[] } }} */
	let { children, data } = $props();

	const links = $derived([
		{ href: '/', label: 'iaco.io', icon: Waves },
		{ href: '/#latest', label: 'latest' },
		...data.pages.map((p) => ({ href: p.url, label: p.title }))
	]);

	let open = $state(false);
	// the cms has its own interface
	const cms = $derived(page.url.pathname.startsWith('/cms'));

	// swipe left from the right edge opens the menu, swipe right closes it
	let start = null;
	/** @param {TouchEvent} e */
	const ontouchstart = (e) => {
		const { clientX: x, clientY: y } = e.touches[0];
		start = !cms && (open || x > window.innerWidth - 32) ? { x, y } : null;
	};
	/** @param {TouchEvent} e */
	const ontouchend = (e) => {
		if (!start) return;
		const dx = e.changedTouches[0].clientX - start.x;
		const dy = e.changedTouches[0].clientY - start.y;
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) open = dx < 0;
		start = null;
	};

	// safari ignores user-scalable=no, so block pinch zoom directly
	onMount(() => {
		const block = (/** @type {Event} */ e) => e.preventDefault();
		document.addEventListener('gesturestart', block);
		return () => document.removeEventListener('gesturestart', block);
	});
</script>

<svelte:window {ontouchstart} {ontouchend} />

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
	.statusbar {
		position: fixed;
		inset: 0 0 auto;
		z-index: 10;
		height: var(--top);
		border: 0;
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
