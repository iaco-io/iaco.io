<script>
	// floating round buttons: menu and scroll to top/bottom, plus an optional extra one.
	// small screens: stacked bottom right. big screens: menu moves to the top right with a label.
	import { Menu as MenuIcon, ArrowDown, ArrowUp } from '@lucide/svelte';

	/** @type {{ onmenu: () => void, extra?: import('svelte').Snippet }} */
	let { onmenu, extra } = $props();

	let atTop = $state(true);
	let scrollable = $state(true);
	const onscroll = () => (atTop = window.scrollY < window.innerHeight / 3);

	// nothing to scroll to: the scroll button nearly disappears
	$effect(() => {
		const check = () => (scrollable = document.documentElement.scrollHeight > window.innerHeight + 8);
		const observer = new ResizeObserver(check);
		observer.observe(document.body);
		addEventListener('resize', check);
		return () => {
			observer.disconnect();
			removeEventListener('resize', check);
		};
	});
	const jump = () => window.scrollTo({ top: atTop ? document.documentElement.scrollHeight : 0 });
</script>

<svelte:window {onscroll} />

{#if extra}<div class="extra">{@render extra()}</div>{/if}

<button class="round glass menu" onclick={onmenu} aria-label="Open menu">
	<span>menu</span>
	<MenuIcon size={20} />
</button>

<button
	class="round glass jump"
	class:idle={!scrollable}
	onclick={jump}
	disabled={!scrollable}
	aria-label={atTop ? 'Scroll to bottom' : 'Scroll to top'}
>
	{#if atTop}<ArrowDown size={20} />{:else}<ArrowUp size={20} />{/if}
</button>

<style>
	.menu,
	.jump,
	.extra {
		position: fixed;
		right: var(--gap);
		z-index: 15;
	}

	.jump {
		bottom: calc(env(safe-area-inset-bottom) + var(--gap));
		transition: opacity 0.3s ease;
	}

	.jump.idle {
		opacity: 0.15;
		cursor: default;
	}

	.menu {
		bottom: calc(env(safe-area-inset-bottom) + var(--gap) + 3.75rem);
	}

	/* extra buttons stack upwards above the menu button */
	.extra {
		bottom: calc(env(safe-area-inset-bottom) + var(--gap) + 7.5rem);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.menu span {
		display: none;
	}

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

		/* the menu left the bottom, so the extra button sits on top of scroll */
		.extra {
			bottom: calc(env(safe-area-inset-bottom) + var(--gap) + 3.75rem);
		}
	}
</style>
