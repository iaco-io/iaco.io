<script>
	// a glass panel that slides in from the right, with a blurred backdrop
	import { X } from '@lucide/svelte';

	/** @type {{ open: boolean, label: string, children: import('svelte').Snippet, bottom?: import('svelte').Snippet }} */
	let { open = $bindable(), label, children, bottom } = $props();

	const close = () => (open = false);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="backdrop" class:open onclick={close} aria-hidden="true"></div>

<nav class="panel glass" class:open aria-label={label} inert={!open}>
	<button class="round glass close" onclick={close} aria-label="Close menu">
		<X size={20} />
	</button>
	<div class="main">{@render children()}</div>
	{#if bottom}<div class="bottom">{@render bottom()}</div>{/if}
</nav>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: var(--scrim);
		opacity: 0;
		pointer-events: none;
		/* hidden for real when closed: safari treats fixed layers at the edges as toolbars */
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
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		width: min(22rem, 85vw);
		padding: calc(var(--top) + 5.5rem) 2rem calc(env(safe-area-inset-bottom) + 2rem);
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
		transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.close {
		position: absolute;
		top: calc(var(--top) + var(--gap));
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
