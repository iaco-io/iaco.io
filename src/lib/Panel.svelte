<script>
	// a floating glass panel that slides in from the right.
	// it stays clear of the screen edges and has no full-screen backdrop:
	// safari 26 paints solid toolbars over anything fixed that touches the edges
	import { X } from '@lucide/svelte';

	/** @type {{ open: boolean, label: string, children: import('svelte').Snippet, bottom?: import('svelte').Snippet }} */
	let { open = $bindable(), label, children, bottom } = $props();

	const close = () => (open = false);

	/** @type {HTMLElement | undefined} */
	let panel = $state();

	// a tap anywhere outside the panel closes it
	/** @param {PointerEvent} e */
	function outside(e) {
		if (open && panel && !panel.contains(/** @type {Node} */ (e.target))) close();
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} onpointerdown={outside} />

<nav bind:this={panel} class="panel glass" class:open aria-label={label} inert={!open}>
	<button class="round glass close" onclick={close} aria-label="Close menu">
		<X size={20} />
	</button>
	<div class="main">{@render children()}</div>
	{#if bottom}<div class="bottom">{@render bottom()}</div>{/if}
</nav>

<style>
	.panel {
		position: fixed;
		top: calc(var(--top) + var(--gap));
		right: var(--gap);
		/* ends well above the bottom: safari paints its toolbar over large fixed things near the bottom edge */
		height: min(36rem, 72svh);
		overflow-y: auto;
		z-index: 30;
		display: flex;
		flex-direction: column;
		width: min(21rem, calc(100vw - 4.5rem));
		padding: 4.5rem 1.75rem 1.75rem;
		border-radius: 2rem;
		background: var(--panel);
		box-shadow: 0 20px 60px var(--shadow);
		transform: translateX(calc(100% + 2 * var(--gap)));
		visibility: hidden;
		transition:
			transform 0.45s cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0s 0.45s;
	}

	.panel.open {
		transform: none;
		visibility: visible;
		transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
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
