<script>
	// every tag used in posts and pages, each with a switch: on promotes the tag to a category, which shows in
	// the blog's menu with its own icon (a lucide icon, or an svg from media; a bookmark if none)
	import { Tag, BookBookmark, Save, Undo2, Image as ImageIcon } from '@lucide/svelte';
	import { cleanTag } from '#lib/tags.js';
	import Gallery from './Gallery.svelte';
	import Thumb from './Thumb.svelte';
	import { DEFAULT_CATEGORY_ICON } from '#lib/tags.js';

	/**
	 * @type {{
	 *   tags: [string, number][],
	 *   categories: string[],
	 *   icons: Record<string, string>,
 *   images: string[],
 *   resolve: (name: string) => string,
		 *   onsave: (categories: string[], icons: Record<string, string>, renames: Record<string, string>) => Promise<void>,
	 *   onclose: () => void
	 * }}
	 */
	let { tags, categories, icons: savedIcons, images, resolve, onsave, onclose } = $props();

	// copies to edit; nothing changes until saved
	let picked = $state(new Set(categories));
	let icons = $state({ ...savedIcons });
	let saving = $state(false);

	function toggle(/** @type {string} */ tag) {
		const next = new Set(picked);
		next.has(tag) ? next.delete(tag) : next.add(tag);
		picked = next;
	}

	async function save() {
		saving = true;
		try {
			// a category whose tag is no longer used is dropped
			await onsave(
				tags.map(([t]) => t).filter((t) => picked.has(t)),
				icons,
				renames()
			);
		} finally {
			saving = false;
		}
	}

	// the lucide icons' names, offered while typing one
	let lucideNames = $state(/** @type {string[]} */ ([]));
	$effect(() => {
		fetch('/lucide/names.json')
			.then((r) => r.json())
			.then((n) => (lucideNames = n))
			.catch(() => {});
	});
	// a lucide icon shows by its name, a media file by its file name
	const iconName = (/** @type {string} */ tag) => (icons[tag] ?? '').replace(/^lucide\//, '');
	const isMedia = (/** @type {string} */ tag) => !!icons[tag] && !icons[tag].startsWith('lucide/');
	// each tag's name can be edited; saving renames it everywhere (a category stays one, with its icon)
	let names = $state(/** @type {Record<string, string>} */ ({}));
	const renames = () =>
		Object.fromEntries(
			Object.entries(names)
				.map(([from, v]) => [from, cleanTag(v)])
				.filter(([from, to]) => to && to !== from)
		);

	// the category whose icon is being picked from media
	let picking = $state(/** @type {string | null} */ (null));
	const iconUrl = (/** @type {string} */ tag) => `/lucide/${(icons[tag] || DEFAULT_CATEGORY_ICON).replace(/^lucide\//, '')}.svg`;

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	$effect(() => dialog?.showModal());

	function outside(/** @type {MouseEvent} */ e) {
		if (e.target !== dialog || !dialog) return;
		const r = dialog.getBoundingClientRect();
		if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onclose();
	}
</script>

<dialog bind:this={dialog} class="glass" oncancel={(e) => (e.preventDefault(), onclose())} onclick={outside}>
	<p class="hint">switch a tag on to make it a category</p>
	{#if tags.length}
		<ul>
			{#each tags as [tag, count] (tag)}
				{@const on = picked.has(tag)}
				<li>
					<span class="icon">{#if on}<BookBookmark size={18} strokeWidth={1.75} />{:else}<Tag size={18} strokeWidth={1.75} />{/if}</span>
					<!-- the name can be changed: saving renames the tag in every post and page -->
					<input
						class="rename"
						aria-label="name of {tag}"
						value={names[tag] ?? tag}
						oninput={(e) => (names[tag] = e.currentTarget.value)}
						autocapitalize="off"
						spellcheck="false"
					/>
					<small class="count">{count}</small>
					<button class="switch" role="switch" aria-checked={on} aria-label="{tag} is a category" onclick={() => toggle(tag)}>
						<span class="track"
							><span class="knob">{#if on}<BookBookmark size={14} strokeWidth={2} />{:else}<Tag size={14} strokeWidth={2} />{/if}</span></span
						>
					</button>
					{#if on}
						<!-- the category's icon in the menu -->
						<div class="looks">
							{#if isMedia(tag)}
								<span class="preview media" aria-hidden="true"><Thumb src={resolve(icons[tag])} name={icons[tag]} size="100%" /></span>
							{:else}
								<span class="preview" style:--icon="url({JSON.stringify(iconUrl(tag))})" aria-hidden="true"></span>
							{/if}
							<input
								aria-label="{tag}'s icon"
								list="category-icons"
								placeholder="book-bookmark"
								autocapitalize="off"
								spellcheck="false"
								value={iconName(tag)}
								oninput={(e) => {
									const v = e.currentTarget.value.trim();
									// a file name (with a dot) is a media file; anything else a lucide name
									icons[tag] = !v || v === 'book-bookmark' ? '' : v.includes('.') ? v : `lucide/${v.toLowerCase()}`;
								}}
							/>
							<button class="pill square pick" title="pick an svg from media" aria-label="pick an svg from media" onclick={() => (picking = tag)}><ImageIcon size={18} /></button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">no tags yet. add them to posts and pages.</p>
	{/if}
	<datalist id="category-icons">
		{#each lucideNames as n}<option value={n}></option>{/each}
	</datalist>
	<div class="buttons">
		<button class="pill" aria-label="cancel" title="cancel" onclick={onclose}><Undo2 size={18} /></button>
		<button class="pill primary" aria-label="save" title="save" disabled={saving} onclick={save}>
			<Save size={18} class={saving ? 'pulse' : ''} />
		</button>
	</div>
</dialog>

{#if picking}
	<Gallery
		images={images.filter((n) => /\.svg$/i.test(n))}
		{resolve}
		current={icons[picking] ?? ''}
		label="category icon"
		ondone={(name) => {
			if (name !== null && picking) icons[picking] = name;
			picking = null;
		}}
	/>
{/if}

<style>
	dialog {
		width: min(24rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 3rem);
		padding: 1.1rem;
		border-radius: 1.5rem;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	.hint,
	.empty {
		margin: 0 0 0.8rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	ul {
		display: grid;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.7rem;
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--bg) 60%, transparent);
	}

	.icon {
		display: flex;
		color: var(--muted);
	}

	/* looks like the name until touched */
	.rename {
		flex: 1;
		min-width: 0;
		padding: 0.3rem 0.5rem;
		margin-left: -0.5rem;
		border: 1px solid transparent;
		border-radius: 0.7rem;
		font: inherit;
		font-size: 16px;
		color: var(--fg);
		background: none;
	}

	.rename:focus {
		border-color: var(--glass-edge);
		background: var(--glass);
	}

	.count {
		color: var(--muted);
	}

	/* name and icon of a category, under its row */
	.looks {
		display: flex;
		flex-basis: 100%;
		align-items: center;
		gap: 0.5rem;
		padding-left: 1.85rem;
	}

	.looks input {
		flex: 1;
		min-width: 0;
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--glass-edge);
		border-radius: 0.7rem;
		font: inherit;
		font-size: 16px;
		color: var(--fg);
		background: var(--glass);
	}

	.preview.media {
		position: relative;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: none;
		-webkit-mask: none;
		mask: none;
	}

	.pick {
		flex: none;
		width: 2.3rem;
		height: 2.3rem;
	}

	.preview {
		flex: none;
		width: 1.3rem;
		height: 1.3rem;
		background: currentColor;
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
	}



	.switch {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}





	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 1rem;
	}

	.buttons .pill {
		min-width: 3.75rem;
		box-shadow: none;
	}
</style>
