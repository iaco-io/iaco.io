<script>
	import { Rss, Copy } from '@lucide/svelte';
	import Refresh from './Refresh.svelte';
	import Panel from './Panel.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Social from './Social.svelte';
	import Rain from './Rain.svelte';

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

	/** @type {HTMLElement | undefined} */
	let list = $state();
	let more = $state(false);
	const measure = () => list && (more = list.scrollTop + list.clientHeight < list.scrollHeight - 1);
	$effect(() => {
		if (!list) return;
		const observer = new ResizeObserver(measure);
		observer.observe(list);
		return () => observer.disconnect();
	});
</script>

<Panel bind:open label="Main" edge>
	<!-- the links scroll on their own when there are many: up to the top of the screen (under the close
	     button), fading out at the bottom while there is more below -->
	<ul class="entries scrolls" class:more bind:this={list} onscroll={measure}>
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
	<div class="rain"><Rain /></div>
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

	/* (over the panel's shared .entries rules) */
	.entries.scrolls {
		flex: 0 1 auto;
		min-height: 0;
		/* starts at the top of the screen; the room for the close button is padding, so it scrolls away */
		margin: calc(-1 * (var(--top) + 5.5rem)) -0.5rem 0;
		padding: calc(var(--top) + 5.5rem) 0.5rem 0.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.scrolls::-webkit-scrollbar {
		display: none;
	}

	.more {
		-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 4rem), transparent);
		mask-image: linear-gradient(to bottom, #000 calc(100% - 4rem), transparent);
	}

	.rain {
		display: flex;
		justify-content: center;
		margin-top: auto;
		margin-bottom: 1.75rem;
	}

	.social {
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
