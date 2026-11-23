<script>
	// every link on the site, grouped; the other addresses that lead to the same place are beside it, smaller
	import { X, File as FileIcon, Feather, ExternalLink, Tag, ListX, BookBookmark, Star, ArrowRight } from '@lucide/svelte';
	import { decrypt } from '#lib/crypto.js';

	/** @type {{ onclose: () => void }} */
	let { onclose } = $props();

	/** @typedef {{ title: string, url: string, aliases: string[], unlisted?: boolean, featured?: boolean, category?: boolean, to?: string }} Link */
	let map = $state(/** @type {Record<string, Link[]> | null} */ (null));
	let failed = $state(false);
	$effect(() => {
		fetch('/cms/sitemap.json')
			.then((r) => r.json())
			.then(async ({ map: locked }) => (map = JSON.parse(await decrypt(locked))))
			.catch(() => (failed = true));
	});

	// each group with the icon the cms uses for it
	const GROUPS = /** @type {const} */ ([
		['pages', 'pages', FileIcon],
		['posts', 'posts', Feather],
		['links', 'redirects', ExternalLink],
		['tags', 'tags', Tag]
	]);

	// the sections, to jump to from the buttons at the bottom
	/** @type {Record<string, HTMLElement>} */
	const sections = $state({});
	const jump = (/** @type {string} */ key) => sections[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	$effect(() => dialog?.showModal());
</script>

<dialog class="dialog glass" bind:this={dialog} oncancel={(e) => (e.preventDefault(), onclose())} aria-label="site map">
	<header>
		<h2>site map</h2>
		<button class="pill" aria-label="close" onclick={onclose}><X size={18} /></button>
	</header>
	{#if failed}
		<p class="note">couldn't load the site map.</p>
	{:else if !map}
		<p class="note">loading…</p>
	{:else}
		<div class="groups">
			{#each GROUPS as [key, label, Icon]}
				{#if map[key]?.length}
					<section bind:this={sections[key]}>
						<h3><Icon size={15} /> {label}</h3>
						<ul>
							{#each map[key] as link}
								<li>
									<a href={link.url} data-sveltekit-reload>{link.url}</a>
									{#if key === 'tags'}<span class="title">{link.title}</span>{/if}
									<!-- marks, as in the cms lists -->
									{#if link.unlisted}<span class="mark" title="unlisted" aria-label="unlisted"><ListX size={15} /></span>{/if}
									{#if link.featured}<span class="mark" title="featured" aria-label="featured"><Star size={15} /></span>{/if}
									{#if link.category}<span class="mark" title="category" aria-label="category"><BookBookmark size={15} /></span>{/if}
									{#if link.to}<span class="extra to"><ArrowRight size={13} /> {link.to}</span>{/if}
									{#each link.aliases as alias}<a class="extra" href={alias} data-sveltekit-reload>{alias.replace(/\/$/, '')}</a>{/each}
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			{/each}
		</div>
		<!-- one button per section, always at the bottom -->
		<nav class="jumps" aria-label="sections">
			{#each GROUPS as [key, label, Icon]}
				{#if map[key]?.length}
					<button class="pill" title={label} aria-label="go to {label}" onclick={() => jump(key)}><Icon size={18} /></button>
				{/if}
			{/each}
		</nav>
	{/if}
</dialog>

<style>
	.dialog {
		width: min(32rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 3rem);
		padding: 1.1rem 1.25rem;
		border-radius: 1.5rem;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
	}

	.dialog[open] {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.groups {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	h3 {
		margin: 0.9rem 0 0.4rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	section:first-child h3 {
		margin-top: 0;
	}

	/* a little room and a thin line between sections */
	section + section {
		margin-top: 1.1rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--glass-edge);
	}

	section + section h3 {
		margin-top: 0;
	}

	.jumps {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		padding-top: 0.25rem;
	}

	.jumps .pill {
		box-shadow: none;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.15rem 0.6rem;
		padding: 0.3rem 0;
	}

	a {
		color: var(--fg);
		font-weight: 500;
		text-decoration: none;
		overflow-wrap: anywhere;
	}

	.title {
		font-size: 0.9rem;
		color: var(--muted);
	}

	/* the other addresses: smaller, grey */
	.extra {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--soft);
		overflow-wrap: anywhere;
	}

	h3 {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.mark {
		display: inline-flex;
		align-self: center;
		color: var(--muted);
	}

	/* where a short link goes: in a warm colour, apart from the grey aliases */
	.to {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: #c07a4a;
	}

	.note {
		margin: 0;
		color: var(--muted);
	}
</style>
