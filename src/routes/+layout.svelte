<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { Waves, Newspaper, BookBookmark } from '@lucide/svelte';
	import { tagUrl } from '#lib/tags.js';
	import { external, destination } from '#lib/links.js';
	import Menu from '#lib/Menu.svelte';
	import Fabs from '#lib/Fabs.svelte';
	import DayClock from '#lib/DayClock.svelte';
	import { page } from '$app/state';

	/** @type {{ children: import('svelte').Snippet, data: { pages: { url: string, title: string }[], categories: string[] } }} */
	let { children, data } = $props();

	const links = $derived([
		{ href: '/', label: 'iaco.io', icon: Waves },
		{ href: '/#latest', label: 'latest', icon: Newspaper },
		...data.categories.map((tag) => ({ href: tagUrl(tag), label: tag, icon: BookBookmark })),
		...data.pages.map((p) => ({ href: p.url, label: p.title }))
	]);

	let open = $state(false);

	// links that leave the site open in a new tab; in the installed app on an iphone (which would show them in a
	// small built-in browser) they open in safari instead. short links like /youtube/ go straight to their site
	const iosApp =
		typeof navigator !== 'undefined' &&
		/iPhone|iPad|iPod/.test(navigator.userAgent) &&
		(matchMedia('(display-mode: standalone)').matches || /** @type {any} */ (navigator).standalone);
	function leave(/** @type {MouseEvent} */ e) {
		if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = /** @type {HTMLAnchorElement | null} */ (/** @type {Element} */ (e.target).closest?.('a[href]'));
		if (!a || a.hasAttribute('download')) return;
		const href = a.getAttribute('href') ?? '';
		if (!external(href)) return;
		e.preventDefault();
		const to = destination(href);
		if (iosApp) location.href = to.replace(/^(https?):/i, 'x-safari-$1:');
		else window.open(to, '_blank', 'noopener,noreferrer');
	}
	// the cms has its own interface
	const cms = $derived(page.url.pathname.startsWith('/cms'));

	// safari ignores user-scalable=no, so block pinch zoom directly
	onMount(() => {
		const block = (/** @type {Event} */ e) => e.preventDefault();
		document.addEventListener('gesturestart', block);
		return () => document.removeEventListener('gesturestart', block);
	});
</script>

<svelte:document onclick={leave} />


<div class="statusbar" aria-hidden="true"></div>

{#if !cms}
	<header>
		<a class="logo" href="/">iaco.io</a>
	</header>
	<DayClock icon="grid" />
{/if}

{@render children()}

{#if !cms}
	<Fabs onmenu={() => (open = true)} />
	<Menu bind:open {links} />
{/if}

<style>
	/* only in the installed app: in safari a fixed bar at the edge makes it paint a solid toolbar */
	/* installed app: content scrolls up under the clock, softly blurred there.
	   the blur covers only the clock area; pages start 16px lower (see --top) so nothing sits under it at rest */
	.statusbar {
		display: none;
		position: fixed;
		inset: 0 0 auto;
		z-index: 10;
		height: env(safe-area-inset-top);
		background: color-mix(in srgb, var(--bg) 30%, transparent);
		-webkit-backdrop-filter: blur(12px);
		backdrop-filter: blur(12px);
		-webkit-mask-image: linear-gradient(black 70%, transparent);
		mask-image: linear-gradient(black 70%, transparent);
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
		/* a touch higher, so its letters line up with the middle of the clock's numbers */
		transform: translateY(-2px);
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--fg);
	}
</style>
