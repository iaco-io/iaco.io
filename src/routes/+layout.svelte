<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { Waves, Newspaper } from '@lucide/svelte';
	import { tagUrl } from '#lib/tags.js';
	import { external, destination } from '#lib/links.js';
	import Menu from '#lib/Menu.svelte';
	import Fabs from '#lib/Fabs.svelte';
	import DayClock from '#lib/DayClock.svelte';
	import { page } from '$app/state';
	import { watchPhantom } from '#lib/phantom.js';

	/** @type {{ children: import('svelte').Snippet, data: { pages: { url: string, title: string, icon: { src: string, mask: boolean } }[], categories: { tag: string, name: string, icon: { src: string, mask: boolean } }[], order: string[] } }} */
	let { children, data } = $props();

	// a link to a page that doesn't exist has no data (the error page then sends the visitor home)
	const order = $derived(data.order ?? []);

	// in the order set in the cms; links not in it keep their usual place after the others
	const rank = (/** @type {string} */ href) => {
		const i = order.indexOf(href);
		return i < 0 ? order.length : i;
	};
	const links = $derived(
		[
			{ href: '/', label: 'iaco.io', icon: Waves },
			{ href: '/#latest', label: 'latest', icon: Newspaper },
			...(data.categories ?? []).map(({ tag, name, icon }) => ({ href: tagUrl(tag), label: name, picture: icon })),
			...(data.pages ?? []).map((p) => ({ href: p.url, label: p.title, picture: p.icon }))
		].toSorted((a, b) => rank(a.href) - rank(b.href))
	);

	let open = $state(false);

	// iphone home-screen apps stop short of the bottom: things there move down (see phantom.js)
	onMount(watchPhantom);

	// back at the start after an error (see +error.svelte): a short note to try again
	let tryAgain = $state(false);
	onMount(() => {
		try {
			const at = sessionStorage.getItem('try-again');
			if (!at || Date.now() - Number(at) > 15_000 || sessionStorage.getItem('try-again-shown') === at) return;
			sessionStorage.setItem('try-again-shown', at);
		} catch {
			return;
		}
		tryAgain = true;
		setTimeout(() => (tryAgain = false), 4000);
	});

	// links that leave the site open in a new tab (in the installed app on an iphone, apple shows them in its small
	// built-in browser; there's no way to send them to safari). short links like /youtube/ go straight to their site
	function leave(/** @type {MouseEvent} */ e) {
		if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const a = /** @type {HTMLAnchorElement | null} */ (/** @type {Element} */ (e.target).closest?.('a[href]'));
		if (!a || a.hasAttribute('download')) return;
		const href = a.getAttribute('href') ?? '';
		if (!external(href)) return;
		e.preventDefault();
		window.open(destination(href), '_blank', 'noopener,noreferrer');
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
	<!-- a landmark of its own, so all content is in one (it is positioned on its own, the aside adds nothing visible) -->
	<aside aria-label="day clock"><DayClock icon="grid" /></aside>
{/if}

{@render children()}

{#if tryAgain}<div class="try-again glass" role="status">please try again</div>{/if}

{#if !cms}
	<Fabs onmenu={() => (open = true)} {open} />
	<Menu bind:open {links} />
{/if}

<style>
	.try-again {
		position: fixed;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom) - var(--phantom) + 1.5rem);
		z-index: 50;
		transform: translateX(-50%);
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 500;
		box-shadow: 0 6px 24px var(--shadow);
	}

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
