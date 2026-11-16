<script>
	import { Rss, Copy } from '@lucide/svelte';
	import Refresh from './Refresh.svelte';
	import Panel from './Panel.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Social from './Social.svelte';

	/** @type {{ open: boolean, links: { href: string, label: string }[] }} */
	let { open = $bindable(), links } = $props();

	const close = () => (open = false);

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
</script>

<Panel bind:open label="Main">
	<ul class="entries">
		{#each links as link}
			<li><a class="entry" href={link.href} onclick={close}>{link.label}</a></li>
		{/each}
		<li>
			<button class="entry" onclick={copyRss}><Rss size={24} strokeWidth={2.25} /> rss</button>
		</li>
	</ul>
	<div class="social"><Social /></div>
	{#snippet bottom()}
		<ThemeToggle />
		<Refresh />
	{/snippet}
</Panel>

<div class="toast glass" class:show={copied} role="status" aria-live="polite">
	<Copy size={16} /> rss link copied
</div>

<style>
	.social {
		margin-top: auto;
		margin-bottom: 2.5rem;
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
