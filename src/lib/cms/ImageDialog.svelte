<script>
	// a small popup for naming a media file on upload, and for renaming, replacing or deleting one.
	// the extension can't be changed; "/" makes folders, like beautiful/cow-and-chicken.
	// replacing points every post and page that uses it to another file (picked or uploaded now);
	// the old file can be kept or deleted. deleting a file that is still used asks for a replacement too.
	import Gallery from './Gallery.svelte';
	import Thumb from './Thumb.svelte';
	import { Trash2, ImagePlus, ChevronDown, ArrowLeft, Save, Undo2, Replace, File as FileIcon, Music, ClipboardPaste } from '@lucide/svelte';
	import { pasteFile } from './clipboard.js';

	/**
	 * @typedef {{ rename: string } | { remove: true, keep: boolean, replacement?: string, upload?: { file: File, name: string } } | null} Result
	 * @type {{
	 *   name: string,
	 *   src: string,
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   uses?: string[],
	 *   manage?: boolean,
	 *   ondone: (result: Result) => void
	 * }}
	 */
	let { name, src, images, resolve, uses = [], manage = false, ondone } = $props();

	const extOf = (/** @type {string} */ n) => n.match(/\.[^./]+$/)?.[0] ?? '';
	/** lowercase, letters, digits and dashes, with "/" between folders */
	const clean = (/** @type {string} */ base) =>
		base
			.toLowerCase()
			.split('/')
			.map((part) => part.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''))
			.filter(Boolean)
			.join('/');

	const ext = extOf(name);
	let base = $state(name.slice(0, name.length - ext.length));
	const next = $derived(clean(base) && clean(base) + ext);
	const taken = $derived(next !== name && images.includes(next));

	const image = /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(name);

	// delete / replace flow; `keep` keeps the old file after replacing it
	let removing = $state(false);
	let keep = $state(false);
	let replacement = $state('');
	let gallery = $state(false);
	/** @type {{ file: File, src: string, ext: string } | null} */
	let fresh = $state(null);
	let freshBase = $state('');
	const freshName = $derived(fresh && clean(freshBase) && clean(freshBase) + fresh.ext);

	let pasteNote = $state('');
	async function paste() {
		pasteNote = '';
		try {
			use(await pasteFile());
		} catch (err) {
			pasteNote = /** @type {Error} */ (err).message;
		}
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} e */
	function pick(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (file) use(file);
	}

	function use(/** @type {File} */ file) {
		const ext = (extOf(file.name.toLowerCase()) || `.${file.type.split('/')[1] ?? 'png'}`).replace(/^\.jpeg$/, '.jpg'); // .jpeg uploads become .jpg
		fresh = { file, src: URL.createObjectURL(file), ext };
		freshBase = clean(file.name.slice(0, file.name.length - extOf(file.name).length));
		replacement = '';
	}

	function confirm() {
		if (!removing) {
			if (!next || taken) return;
			if (manage && next === name) return ondone(null);
			return ondone({ rename: next });
		}
		if (fresh) {
			if (!freshName || images.includes(freshName)) return;
			return ondone({ remove: true, keep, upload: { file: fresh.file, name: freshName } });
		}
		if (keep && !replacement) return;
		ondone({ remove: true, keep: keep && !!replacement, ...(replacement ? { replacement } : {}) });
	}

	const swapping = $derived(!!(fresh || replacement));
	const options = $derived(images.filter((i) => i !== name && /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(i) === image));

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	$effect(() => dialog?.showModal());

	/** a tap on the dimmed area around the popup closes it, changing nothing */
	function outside(/** @type {MouseEvent} */ e) {
		if (e.target !== dialog || !dialog) return;
		const r = dialog.getBoundingClientRect();
		if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ondone(null);
	}
</script>

{#if gallery}
	<Gallery
		images={options}
		{resolve}
		current={replacement}
		label="replace with"
		none={!keep}
		ondone={(n) => ((gallery = false), n !== null && (replacement = n))}
	/>
{/if}

{#snippet used(/** @type {string} */ after)}
	<div class="uses">
		<small>used in{after ? ` ${after}` : ''}:</small>
		<ul>
			{#each uses as title}<li>{title}</li>{/each}
		</ul>
	</div>
{/snippet}

<dialog bind:this={dialog} class="glass" oncancel={(e) => (e.preventDefault(), ondone(null))} onclick={outside}>
	<form onsubmit={(e) => (e.preventDefault(), confirm())}>
		{#if image || fresh}
			<span class="big"><Thumb src={fresh?.src ?? src} name={fresh ? `x${fresh.ext}` : name} size="28%" /></span>
		{:else}
			<span class="big file">{#if /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(name)}<Music size={40} />{:else}<FileIcon size={40} />{/if}</span>
		{/if}

		{#if !removing}
			<span class="label">{manage ? 'name' : 'name the file'}</span>
			<span class="suffix" style:--ext="{ext.length + 2}ch">
				<!-- svelte-ignore a11y_autofocus -->
				<input bind:value={base} autofocus autocapitalize="off" autocorrect="off" spellcheck="false" />
				<em>{ext}</em>
			</span>
			<small>{taken ? (manage ? 'that name is taken' : 'replaces the image with that name') : 'use / for folders, like beautiful/cow-and-chicken'}</small>
			{#if manage && uses.length}
				{@render used('(renaming updates them all)')}
			{/if}
		{:else}
			<span class="label">{keep ? 'replace' : 'delete'} {name}</span>
			{#if uses.length || keep}
				{#if uses.length}{@render used('')}{/if}
				<small>pick what goes there instead:</small>
				{#if fresh}
					<span class="suffix" style:--ext="{fresh.ext.length + 2}ch">
						<input bind:value={freshBase} autocapitalize="off" autocorrect="off" spellcheck="false" />
						<em>{fresh.ext}</em>
					</span>
					{#if freshName && images.includes(freshName)}<small>that name is taken</small>{/if}
				{:else}
					<div class="picker">
						{#if replacement && image}<span class="mini"><Thumb src={resolve(replacement)} name={replacement} size="60%" /></span>{/if}
						<button type="button" class="choose" onclick={() => (gallery = true)}>
							{replacement || (keep ? 'pick one…' : 'nothing')}
							<ChevronDown size={18} />
						</button>
						<label class="pill square" title="upload a replacement">
							<ImagePlus size={18} />
							<input type="file" accept={image ? 'image/*' : ''} onchange={pick} hidden />
						</label>
						<button type="button" class="pill square" title="paste a replacement" onclick={paste}><ClipboardPaste size={18} /></button>
					</div>
					{#if pasteNote}<small>{pasteNote}</small>{/if}
				{/if}
				{#if swapping}
					<button type="button" class="switch" role="switch" aria-checked={keep} onclick={() => (keep = !keep)}>
						<span class="track"><span class="knob"></span></span>
						keep {name}
					</button>
				{/if}
			{:else}
				<small>no post or page uses it.</small>
			{/if}
		{/if}

		<div class="buttons">
			{#if manage && !removing}
				<button type="button" class="pill danger" aria-label="delete" onclick={() => ((removing = true), (keep = false))}><Trash2 size={18} /></button>
				<button type="button" class="pill" aria-label="replace" onclick={() => ((removing = true), (keep = true))}><Replace size={18} /></button>
			{:else if removing}
				<button type="button" class="pill" aria-label="back" onclick={() => ((removing = false), (fresh = null))}><ArrowLeft size={18} /></button>
			{/if}
			<span class="gap"></span>
			<button type="button" class="pill" aria-label="cancel" title="cancel" onclick={() => ondone(null)}><Undo2 size={18} /></button>
			{#if removing}
				{#if keep}
					<button class="pill primary" aria-label="replace" title="replace" disabled={!swapping}><Save size={18} /></button>
				{:else}
					<button class="pill danger">{swapping ? 'replace & delete' : 'delete'}</button>
				{/if}
			{:else}
				<button class="pill primary" aria-label={manage ? 'save' : null} disabled={!next || (manage && taken)}>{#if manage}<Save size={18} />{:else}upload{/if}</button>
			{/if}
		</div>
	</form>
</dialog>

<style>
	dialog {
		width: min(22rem, calc(100vw - 2rem));
		padding: 1.25rem;
		border-radius: 1.5rem;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 85%, transparent);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	form {
		display: grid;
		gap: 0.6rem;
	}

	.big,
	.mini {
		position: relative;
		display: grid;
		place-items: center;
		overflow: hidden;
		border-radius: 0.9rem;
		background: var(--panel);
	}

	.big {
		width: 100%;
		height: 10rem;
	}

	.uses {
		display: grid;
		gap: 0.2rem;
	}

	.uses ul {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}

	.uses li::before {
		content: '• ';
		color: var(--muted);
	}

	.file {
		display: grid;
		place-items: center;
		height: 6rem;
		color: var(--muted);
		background: var(--panel);
	}

	.switch {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0;
		border: 0;
		font: inherit;
		color: var(--fg);
		background: none;
		cursor: pointer;
		overflow-wrap: anywhere;
		text-align: left;
	}





	.small {
		width: 4rem;
		height: 4rem;
		object-fit: cover;
		border-radius: 0.75rem;
	}

	.label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	small {
		color: var(--muted);
	}

	.suffix {
		position: relative;
		display: block;
	}

	.suffix input {
		padding-right: calc(1rem + var(--ext));
	}

	.suffix em {
		position: absolute;
		top: 50%;
		right: 1rem;
		font-style: normal;
		color: var(--muted);
		pointer-events: none;
		transform: translateY(-50%);
	}

	.picker {
		display: flex;
		gap: 0.5rem;
	}

	.picker {
		height: 2.875rem;
	}

	.picker > * {
		height: 100%;
	}

	.mini {
		flex: none;
		width: 2.875rem;
		border-radius: 0.75rem;
	}

	.choose {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0 1rem;
		border: 1px solid var(--glass-edge);
		border-radius: 0.9rem;
		font: inherit;
		font-size: 16px;
		color: var(--fg);
		background: var(--glass);
		cursor: pointer;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		text-align: left;
	}

	.choose :global(svg) {
		flex: none;
		color: var(--muted);
	}

	.square {
		flex: none;
		width: 2.9rem;
		height: auto;
		padding: 0;
		box-shadow: none;
	}

	.buttons {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	/* wide buttons, in two groups: delete/replace on the left, cancel/save on the right */
	.buttons .pill {
		min-width: 3.75rem;
		box-shadow: none;
	}

	.gap {
		flex: 1;
		min-width: 1rem;
	}
</style>
