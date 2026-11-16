<script>
	// a glass panel that slides in from the right over a dimmed page.
	// safari 26 paints solid toolbars over anything *fixed* near the screen edges, so the panel and its
	// backdrop are placed in the page instead (absolute, where it is scrolled to), reaching well past the
	// screen so they also show through safari's glass bars. the page can't scroll while it's open.
	import { X } from '@lucide/svelte';

	/** @type {{ open: boolean, label: string, children: import('svelte').Snippet, bottom?: import('svelte').Snippet }} */
	let { open = $bindable(), label, children, bottom } = $props();

	const close = () => (open = false);

	const BLEED = 200; // px drawn beyond the visible screen, above and below
	let top = $state(0);
	let height = $state(0);
	/** @type {ReturnType<typeof setTimeout>} */
	let timer;

	$effect(() => {
		if (!open) {
			// after sliding out, take no space, so the page doesn't get longer
			timer = setTimeout(() => (height = 0), 450);
			return;
		}
		clearTimeout(timer);
		const vv = window.visualViewport;
		top = (vv?.pageTop ?? window.scrollY) - BLEED;
		height = (vv?.height ?? window.innerHeight) + 2 * BLEED;
		const still = (/** @type {Event} */ e) => e.preventDefault();
		addEventListener('touchmove', still, { passive: false });
		addEventListener('wheel', still, { passive: false });
		return () => {
			removeEventListener('touchmove', still);
			removeEventListener('wheel', still);
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<!-- clips the panel while it slides, so the page never gets wider; takes no space when closed -->
<div class="layer" style:top="{top}px" style:height="{height}px" style:--bleed="{BLEED}px">
	<div class="backdrop" class:open onclick={close} aria-hidden="true"></div>

	<nav class="panel glass" class:open aria-label={label} inert={!open}>
		<button class="round glass close" onclick={close} aria-label="Close menu">
			<X size={20} />
		</button>
		<div class="main">{@render children()}</div>
		{#if bottom}<div class="bottom">{@render bottom()}</div>{/if}
	</nav>
</div>

<style>
	.layer {
		position: absolute;
		right: 0;
		left: 0;
		z-index: 20;
		overflow: hidden;
		pointer-events: none;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background: var(--scrim);
		opacity: 0;
		pointer-events: none;
		visibility: hidden;
		transition:
			opacity 0.35s ease,
			visibility 0s 0.35s;
	}

	.backdrop.open {
		opacity: 1;
		pointer-events: auto;
		visibility: visible;
		transition: opacity 0.35s ease;
	}

	.panel {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		width: min(22rem, 85vw);
		overflow: hidden;
		/* the bleed above and below is padding, so the content sits on the visible screen */
		padding: calc(var(--bleed) + var(--top) + 5.5rem) 2rem calc(var(--bleed) + env(safe-area-inset-bottom) + 2rem);
		background: var(--panel);
		border-width: 0 0 0 1px;
		transform: translateX(100%);
		visibility: hidden;
		transition:
			transform 0.45s cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0s 0.45s;
	}

	.panel.open {
		transform: none;
		visibility: visible;
		pointer-events: auto;
		transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.close {
		position: absolute;
		top: calc(var(--bleed) + var(--top) + var(--gap));
		right: var(--gap);
	}

	/* fills the panel, so content can push itself down with margin-top: auto */
	.main {
		display: flex;
		flex: 1;
		flex-direction: column;
	}

	.bottom {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	/* big menu entries, shared by the blog and the cms */
	.panel :global(.entries) {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.panel :global(.entry) {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.6rem 0;
		border: 0;
		background: none;
		font-family: inherit;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--fg);
		text-align: left;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.panel :global(.entry:hover),
	.panel :global(.entry.active) {
		color: var(--accent);
	}
</style>
