<script>
	import { Rss, Copy } from '@lucide/svelte';
	import Refresh from './Refresh.svelte';
	import Panel from './Panel.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Social from './Social.svelte';
	import Rain from './Rain.svelte';
	import { menuList } from './menuList.js';

	/** @type {{ open: boolean, links: { href: string, label: string, icon?: import('svelte').Component<any>, picture?: { src: string, mask: boolean } }[] }} */
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

<Panel bind:open label="Main" edge>
	<!-- the links scroll on their own when there are many: up to the top of the screen (under the close
	     button), fading out at the bottom while there is more below -->
	<ul class="entries" {@attach menuList(() => open)}>
		{#each links as { href, label, icon: Icon, picture }}
			<li>
				<a class="entry" {href} onclick={close}>
					{#if Icon}<Icon size={24} strokeWidth={1.75} />
					{:else if picture?.mask}<span class="picture mask" style:--icon={`url(${JSON.stringify(picture.src)})`}></span>
					{:else if picture}<img class="picture" src={picture.src} alt="" />{/if}
					{label}
				</a>
			</li>
		{/each}
		<li>
			<button class="entry" onclick={copyRss}><Rss size={24} strokeWidth={1.75} /> rss</button>
		</li>
	</ul>
	<div class="social"><Social /></div>
	{#snippet bottom()}
		<!-- rain, the theme, and the version (tap it to load the newest) -->
		<Rain />
		<ThemeToggle />
		<Refresh />
	{/snippet}
</Panel>

<div class="toast glass" class:show={copied} role="status" aria-live="polite">
	<Copy size={16} /> rss link copied
</div>

<style>
	/* a page's own icon: lucide or one-colour svgs in the text colour, other pictures as they are */
	.picture {
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		object-fit: cover;
	}

	.mask {
		border-radius: 0;
		background: currentColor;
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
	}

	.social {
		margin-top: auto;
		margin-bottom: 3rem;
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
