<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { Waves, Newspaper } from '@lucide/svelte';
	import Menu from '#lib/Menu.svelte';
	import Fabs from '#lib/Fabs.svelte';
	import DayClock from '#lib/DayClock.svelte';
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
