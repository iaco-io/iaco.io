<script>
	import { X, RotateCw, Rss, Copy } from '@lucide/svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Social from './Social.svelte';

	/** @type {{ open: boolean, links: { href: string, label: string }[] }} */
	let { open = $bindable(), links } = $props();

	const close = () => (open = false);

	let refreshing = $state(false);
	let copied = $state(false);
	/** @type {ReturnType<typeof setTimeout>} */
	let timer;

	async function copyRss() {
		try {
			await navigator.clipboard.writeText(new URL('/rss.xml', location.href).href);
		} catch {}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}

	// drop cached files and fetch the newest version of this page
	async function refresh() {
		refreshing = true;
		try {
			await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
			await (await navigator.serviceWorker?.getRegistration())?.update();
		} catch {}
		location.reload();
	}
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
		<li>
			<button class="link" onclick={copyRss}><Rss size={24} strokeWidth={2.25} /> rss</button>
		</li>
	</ul>
	<div class="social"><Social /></div>
	<div class="bottom">
		<ThemeToggle />
		<button class="round glass refresh" class:spin={refreshing} onclick={refresh} aria-label="refresh">
			<RotateCw size={18} />
		</button>
		<span class="version">v {__VERSION__}</span>
	</div>
</nav>

<div class="toast glass" class:show={copied} role="status" aria-live="polite">
	<Copy size={16} /> rss link copied
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 20;
		background: var(--scrim);
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
		display: flex;
		flex-direction: column;
		width: min(22rem, 85vw);
		padding: calc(var(--top) + 5.5rem) 2rem calc(env(safe-area-inset-bottom) + 2rem);
		background: var(--panel);
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

	.social {
		margin-top: auto;
		margin-bottom: 2.5rem;
	}

	.bottom {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.version {
		margin-left: 0.25rem;
		font-size: 0.75rem;
		color: var(--muted);
	}

	.refresh {
		width: 3.1rem;
		height: 3.1rem;
	}

	.spin :global(svg) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a,
	.link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--fg);
		transition: color 0.2s ease;
	}

	.link {
		width: 100%;
		border: 0;
		background: none;
		font-family: inherit;
		cursor: pointer;
	}

	a:hover,
	.link:hover {
		color: var(--accent);
	}

	.toast {
		position: fixed;
		left: 50%;
		top: calc(var(--top) + 1.75rem);
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--fg);
		box-shadow: 0 6px 24px var(--shadow);
		opacity: 0;
		pointer-events: none;
		transform: translate(-50%, -1rem);
		transition:
			opacity 0.25s ease,
			transform 0.25s ease;
	}

	.toast.show {
		opacity: 1;
		transform: translate(-50%, 0);
	}
</style>
