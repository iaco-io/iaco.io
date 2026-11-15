<script>
	import '../app.css';
	import { Menu as MenuIcon, ArrowDown, ArrowUp } from '@lucide/svelte';
	import Menu from '#lib/Menu.svelte';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/#latest', label: 'Latest' },
		{ href: '/#about', label: 'About' }
	];

	let open = $state(false);
	let atTop = $state(true);

	const onscroll = () => (atTop = window.scrollY < window.innerHeight / 3);

	const jump = () =>
		window.scrollTo({ top: atTop ? document.documentElement.scrollHeight : 0 });
</script>

<svelte:window {onscroll} />

<div class="statusbar glass" aria-hidden="true"></div>

<header>
	<a class="logo" href="/">iaco</a>
</header>

{@render children()}

<button class="round glass menu" onclick={() => (open = true)} aria-label="Open menu">
	<span>menu</span>
	<MenuIcon size={20} />
</button>

<button class="round glass jump" onclick={jump} aria-label={atTop ? 'Scroll to bottom' : 'Scroll to top'}>
	{#if atTop}<ArrowDown size={20} />{:else}<ArrowUp size={20} />{/if}
</button>

<Menu bind:open {links} />

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
		color: var(--ink);
	}

	/* small screens: both buttons stacked bottom right */
	.menu,
	.jump {
		position: fixed;
		right: var(--gap);
		z-index: 15;
	}

	.jump {
		bottom: calc(env(safe-area-inset-bottom) + var(--gap));
	}

	.menu {
		bottom: calc(env(safe-area-inset-bottom) + var(--gap) + 3.75rem);
	}

	.menu span {
		display: none;
	}

	/* big screens: menu moves to the top right with a label */
	@media (min-width: 768px) {
		.menu {
			top: calc(var(--top) + var(--gap));
			bottom: auto;
			width: auto;
			gap: 0.6rem;
			padding: 0 0.6rem 0 1.25rem;
			font: inherit;
			font-size: 0.95rem;
			font-weight: 500;
		}

		.menu span {
			display: inline;
		}
	}
</style>
