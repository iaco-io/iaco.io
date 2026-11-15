<script>
	import { X } from '@lucide/svelte';

	/** @type {{ open: boolean, links: { href: string, label: string }[] }} */
	let { open = $bindable(), links } = $props();

	const close = () => (open = false);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="backdrop" class:open onclick={close} aria-hidden="true"></div>

<nav class="panel glass" class:open aria-label="Main" inert={!open}>
	<button class="round glass close" onclick={close} aria-label="Close menu">
		<X size={20} />
	</button>
	<ul>
		{#each links as link}
			<li><a href={link.href} onclick={close}>{link.label}</a></li>
		{/each}
	</ul>
</nav>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: rgb(15 42 71 / 0.15);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.35s ease;
	}

	.backdrop.open {
		opacity: 1;
		pointer-events: auto;
	}

	.panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		width: min(22rem, 85vw);
		padding: calc(var(--top) + 5.5rem) 2rem 2rem;
		background: rgb(244 236 220 / 0.55);
		border-width: 0 0 0 1px;
		transform: translateX(100%);
		transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.panel.open {
		transform: none;
	}

	.close {
		position: absolute;
		top: calc(var(--top) + var(--gap));
		right: var(--gap);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: block;
		padding: 0.6rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--ink);
		transition: color 0.2s ease;
	}

	a:hover {
		color: var(--blue);
	}
</style>
