<script>
	// floating round buttons: menu and scroll to top/bottom, plus an optional extra one.
	// small screens: stacked bottom right. big screens: menu moves to the top right with a label.
	import { Menu as MenuIcon, ArrowDown, ArrowUp } from '@lucide/svelte';

	/** @type {{ onmenu: () => void, open?: boolean, extra?: import('svelte').Snippet, target?: HTMLElement | null }} */
	let { onmenu, open = false, extra, target = null } = $props();

	// what scrolls: the page, or the element given
	const top = () => (target ? target.scrollTop : window.scrollY);
	const height = () => (target ? target.clientHeight : window.innerHeight);
	const full = () => (target ? target.scrollHeight : document.documentElement.scrollHeight);

	let atTop = $state(true);
	let scrollable = $state(true);
	const onscroll = () => (atTop = top() < height() / 3);

	// nothing to scroll to: the scroll button nearly disappears
	$effect(() => {
		const check = () => (scrollable = full() > height() + 8);
		const observer = new ResizeObserver(check);
		observer.observe(target?.firstElementChild ?? document.body);
		if (target) observer.observe(target);
		onscroll();
		target?.addEventListener('scroll', onscroll);
		addEventListener('resize', check);
		return () => {
			observer.disconnect();
			target?.removeEventListener('scroll', onscroll);
			removeEventListener('resize', check);
		};
	});
	const jump = () => (target ?? window).scrollTo({ top: atTop ? full() : 0, behavior: 'smooth' });
</script>

<svelte:window {onscroll} />

{#if extra}<div class="extra">{@render extra()}</div>{/if}

<button class="round glass menu" onclick={onmenu} aria-label="Open menu" aria-expanded={open} aria-controls="panel">
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
		bottom: calc(env(safe-area-inset-bottom) - var(--phantom) + var(--gap));
		transition: opacity 0.3s ease;
	}

	.jump.idle {
		opacity: 0.15;
		cursor: default;
	}

	.menu {
		bottom: calc(env(safe-area-inset-bottom) - var(--phantom) + var(--gap) + 3.75rem);
	}

	/* extra buttons stack upwards above the menu button */
	.extra {
		bottom: calc(env(safe-area-inset-bottom) - var(--phantom) + var(--gap) + 7.5rem);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.menu span {
		display: none;
	}

	/* iphone home-screen apps that start under the clock (see phantom.js): ios moves the page's bottom edge
	   around and cuts fixed things below it, so the buttons are placed from the top, which holds still, just
	   above the lowest that edge goes */
	@media (max-width: 767px) {
		:global(html.pinned) .jump,
		:global(html.pinned) .menu,
		:global(html.pinned) .extra {
			bottom: auto;
			translate: 0 -100%;
		}

		:global(html.pinned) .jump {
			top: calc(var(--screen-bottom) - 0.5rem);
		}

		:global(html.pinned) .menu {
			top: calc(var(--screen-bottom) - 0.5rem - 3.75rem);
		}

		:global(html.pinned) .extra {
			top: calc(var(--screen-bottom) - 0.5rem - 7.5rem);
		}
	}

	@media (min-width: 768px) {
		.menu {
			top: calc(var(--top) + var(--gap));
			bottom: auto;
			width: auto;
			gap: 0.6rem;
			padding: 0 1.05rem; /* the same on both sides, so text and icon sit in the middle */
			font: inherit;
			font-size: 0.95rem;
			font-weight: 500;
		}

		.menu span {
			display: inline;
		}

		/* the menu left the bottom, so the extra button sits on top of scroll */
		.extra {
			bottom: calc(env(safe-area-inset-bottom) - var(--phantom) + var(--gap) + 3.75rem);
		}
	}
</style>
