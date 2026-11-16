<script>
	import { ArrowLeft, CloudAlert, ImagePlus, Save, Trash2, Plus, X, ClipboardPaste, Music, Film, File as FileIcon, Calendar } from '@lucide/svelte';
	import Device from './Device.svelte';
	import { pasteFile } from './clipboard.js';
	import { urls, serialize } from '../markdown.js';

	/**
	 * @typedef {{ title: string, description: string, image: string, date: string, draft: boolean, alias: string[], redirect: string }} Meta
	 * @type {{
	 *   item: { kind: 'posts' | 'pages' | 'redirects', name: string, from: string, isNew: boolean, meta: Meta, body: string },
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   onsave: () => Promise<void>,
	 *   onupload: (file: File, name: string) => Promise<string>,
	 *   ask: (props: Record<string, any>) => Promise<any>,
	 *   manage: (name: string) => Promise<string>,
	 *   ondelete: () => Promise<void>,
	 *   onback: () => void,
	 *   partial: boolean,
	 *   ondiscard: () => void
	 * }}
	 */
	let { item = $bindable(), images, resolve, ask, manage, onsave, onupload, ondelete, onback, partial, ondiscard } = $props();

	let busy = $state('');
	/** @type {HTMLTextAreaElement | undefined} */
	let textarea = $state();

	// redirects only need a name and a destination
	const short = $derived(item.kind === 'redirects');
	const validName = $derived(/^[a-z0-9][a-z0-9-]*$/.test(item.name));
	const links = $derived.by(() => {
		if (!validName) return '';
		const { id, url } = urls(item.kind, item.name);
		return [url.slice(0, -1), id && `/${id}`].filter(Boolean).join(' and ');
	});

	/** aliases are saved without slashes: 'ig', not '/ig/' */
	const cleanAliases = (/** @type {string[]} */ list) =>
		list.map((a) => a.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);

	const escape = (/** @type {string} */ t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

	/** the .md file as it will be saved, with the yaml part coloured */
	const source = $derived(
		serialize(
			{ ...item.meta, alias: cleanAliases(item.meta.alias) },
			short ? '' : item.body
		)
			.split('\n')
			.map((line, i, lines) => {
				const yaml = lines.slice(0, i).filter((l) => l === '---').length < 2;
				if (line === '---') return `<span class="fence">---</span>`;
				if (!yaml) return escape(line);
				const pair = line.match(/^(\w+):(.*)$/);
				if (pair) return `<span class="key">${pair[1]}</span>:<span class="value">${escape(pair[2])}</span>`;
				const item = line.match(/^(\s+-)(.*)$/);
				if (item) return `<span class="dash">${item[1]}</span><span class="value">${escape(item[2])}</span>`;
				return escape(line);
			})
			.join('\n')
	);

	/** @param {string} label @param {() => Promise<unknown>} task */
	async function run(label, task) {
		busy = label;
		try {
			await task();
		} finally {
			busy = '';
		}
	}

	/** inserts text at the cursor in the body */
	function insert(/** @type {string} */ text) {
		const start = textarea?.selectionStart ?? item.body.length;
		const end = textarea?.selectionEnd ?? start;
		item.body = item.body.slice(0, start) + text + item.body.slice(end);
	}

	/** asks for a name, then uploads; null when cancelled */
	async function named(/** @type {File} */ file) {
		const ext = (file.name.match(/\.[^./]+$/)?.[0]?.toLowerCase() || `.${file.type.split('/')[1] ?? 'png'}`).replace(/^\.jpeg$/, '.jpg'); // .jpeg uploads become .jpg
		const base = file.name.replace(/\.[^./]+$/, '').toLowerCase();
		const src = URL.createObjectURL(file);
		const result = /** @type {{ rename: string } | null} */ (await ask({ name: base + ext, src }));
		if (!result) return null;
		return onupload(file, result.rename);
	}

	let imageNote = $state('');

	/** @param {Event & { currentTarget: HTMLInputElement }} e */
	async function upload(e) {
		const files = [...(e.currentTarget.files ?? [])];
		e.currentTarget.value = '';
		for (const file of files) {
			const name = await named(file);
			if (!name) continue;
			await run('uploading…', async () => {
				added.push(name);
				insert(`\n![](${name})\n`);
				if (!item.meta.image) item.meta.image = name;
			});
		}
	}

	/** uploads a file and makes it the main image */
	async function setCover(/** @type {File} */ file) {
		const name = await named(file);
		if (!name) return;
		item.meta.image = name;
		added.push(name);
	}

	/** long press on a thumbnail: rename, replace or delete */
	async function hold(/** @type {string} */ name) {
		imageNote = '';
		imageNote = await manage(name);
	}

	// tell a long press from a tap on the thumbnails
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let pressTimer;
	let pressed = false;
	const press = (/** @type {string} */ name) => {
		pressed = false;
		pressTimer = setTimeout(() => ((pressed = true), hold(name)), 500);
	};
	const release = () => clearTimeout(pressTimer);

	/** title and description grow with their text; they stay one line in the file */
	const fit = (/** @type {() => string} */ read) => (/** @type {HTMLTextAreaElement} */ el) => {
		read();
		el.style.height = 'auto';
		el.style.height = `${el.scrollHeight + 2}px`;
	};
	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const pretty = (/** @type {string} */ d) => {
		const [y, m, day] = d.split('-');
		return y && m && day ? `${y}-${MONTHS[Number(m) - 1]}-${day}` : '';
	};
	const oneLine = (/** @type {KeyboardEvent} */ e) => e.key === 'Enter' && e.preventDefault();
	const flat = (/** @type {string} */ t) => t.replace(/\s*\n\s*/g, ' ');

	// live previews: the iframes load /preview/ and get the unsaved post by postMessage
	/** @type {HTMLIFrameElement | undefined} */
	let phone = $state();
	/** @type {HTMLIFrameElement | undefined} */
	let desktop = $state();
	const payload = $derived(
		JSON.parse(
			JSON.stringify({
				type: 'preview',
				item: { title: item.meta.title, description: item.meta.description, image: item.meta.image },
				body: item.body,
				images: Object.fromEntries(images.map((name) => [name, resolve(name)]))
			})
		)
	);
	const send = () => {
		for (const frame of [phone, desktop]) frame?.contentWindow?.postMessage(payload, location.origin);
	};
	$effect(send);
	$effect(() => {
		/** @param {MessageEvent} e */
		const ready = (e) => e.origin === location.origin && e.data?.type === 'preview-ready' && send();
		addEventListener('message', ready);
		return () => removeEventListener('message', ready);
	});

	let coverNote = $state('');

	// thumbnails: images used in this post or uploaded now; the rest of media behind "more"
	let added = $state(/** @type {string[]} */ ([]));
	let showAll = $state(false);
	const used = $derived([
		...added,
		...(item.meta.image ? [item.meta.image] : []),
		...[...item.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1])
	]);
	const isImage = (/** @type {string} */ n) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(n);
	const isAudio = (/** @type {string} */ n) => /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(n);
	const isVideo = (/** @type {string} */ n) => /\.(mp4|mov|webm|m4v)$/i.test(n);
	// the main image can only be an image; the thumbnails show every file, with an icon for non-images
	const pictures = $derived(images.filter(isImage));
	const shown = $derived(images.filter((name) => used.includes(name)));
	const others = $derived(images.filter((name) => !used.includes(name)));
	// images go in as images, other files as links
	const snippet = (/** @type {string} */ name) => (isImage(name) ? `![](${name})` : `[${name.replace(/^.*\/|\.[^.]+$/g, '')}](${name})`);

	/** @param {Event & { currentTarget: HTMLInputElement }} e */
	function uploadCover(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (file) setCover(file);
	}

	async function pasteCover() {
		coverNote = '';
		try {
			await setCover(await pasteFile());
		} catch (err) {
			coverNote = /** @type {Error} */ (err).message;
		}
	}

	/** paste an image into the body, like uploading one */
	async function pasteImage() {
		imageNote = '';
		try {
			const file = await pasteFile();
			const name = await named(file);
			if (!name) return;
			added.push(name);
			insert(`\n![](${name})\n`);
			if (!item.meta.image) item.meta.image = name;
		} catch (err) {
			imageNote = /** @type {Error} */ (err).message;
		}
	}

	async function remove() {
		if (!confirm(`delete "${item.meta.title || item.name}"? this can't be undone here.`)) return;
		await run('deleting…', ondelete);
	}
</script>

<div class="bar">
	<button class="pill" aria-label="back" title="back" onclick={onback}><ArrowLeft size={18} /></button>
	<div class="actions">
		{#if partial}
			<button
				class="pill unsaved"
				title="changes kept on this device until you save. tap to discard them"
				onclick={() => confirm('discard the changes you haven\'t saved?') && ondiscard()}
			>
				<CloudAlert size={18} />
			</button>
		{/if}
		<button
			class="pill primary"
			aria-label={busy || 'save'}
			title={busy || 'save'}
			disabled={!!busy || !validName || !item.meta.title.trim() || (short && !item.meta.redirect)}
			onclick={() => run('saving…', onsave)}
		>
			<Save size={18} class={busy ? 'pulse' : ''} />
		</button>
	</div>
</div>

<div class="fields">
	<label class="wide">
		<span>title</span>
		<textarea class="grow" rows="1" bind:value={() => item.meta.title, (v) => (item.meta.title = flat(v))} placeholder="title" onkeydown={oneLine} {@attach fit(() => item.meta.title)}></textarea>
	</label>
	<label>
		<span>file name {links ? `→ ${links}` : ''}</span>
		<span class="suffix">
			<input bind:value={item.name} placeholder="file-name" />
			<em>.md</em>
		</span>
	</label>
	{#if !short}
		<label>
			<span>date (rss only)</span>
			<!-- shown as 2026-Nov-16; the real (invisible) date field on top opens the picker -->
			<span class="date">
				<Calendar size={18} />
				{pretty(item.meta.date) || 'no date'}
				<input type="date" bind:value={item.meta.date} />
			</span>
		</label>
		<label class="wide">
			<span>description</span>
			<textarea class="grow" rows="1" bind:value={() => item.meta.description, (v) => (item.meta.description = flat(v))} placeholder="a short summary for lists and rss" onkeydown={oneLine} {@attach fit(() => item.meta.description)}></textarea>
		</label>
		<div>
			<span class="label">main image</span>
			<div class="picker">
				{#if item.meta.image}
					<button class="thumb cover" title="rename, replace or delete" onclick={() => hold(item.meta.image)}>
						<img src={resolve(item.meta.image)} alt={item.meta.image} />
					</button>
				{/if}
				<select bind:value={item.meta.image}>
					<option value="">none</option>
					{#each pictures as name}<option value={name}>{name}</option>{/each}
				</select>
				<label class="pill square" title="upload a new main image">
					<ImagePlus size={18} />
					<input type="file" accept="image/*" onchange={uploadCover} hidden disabled={!!busy} />
				</label>
				<button class="pill square" title="paste main image from clipboard" disabled={!!busy} onclick={pasteCover}>
					<ClipboardPaste size={18} />
				</button>
			</div>
			{#if coverNote}<small class="note">{coverNote}</small>{/if}
		</div>
	{/if}
	<label class="wide">
		<span>redirect to</span>
		<input type="url" bind:value={item.meta.redirect} placeholder="https://…" />
	</label>
	<div class="wide">
		<span class="label">aliases</span>
		<div class="aliases">
			{#each item.meta.alias, i}
				<div class="alias">
					<input bind:value={item.meta.alias[i]} placeholder="alias" />
					<button class="icon" aria-label="remove alias" onclick={() => item.meta.alias.splice(i, 1)}>
						<X size={16} />
					</button>
				</div>
			{/each}
			<button class="pill add" onclick={() => item.meta.alias.push('')}><Plus size={16} /> alias</button>
		</div>
	</div>
	<button
		class="switch wide"
		role="switch"
		aria-checked={item.meta.draft}
		onclick={() => (item.meta.draft = !item.meta.draft)}
	>
		<span class="track"><span class="knob"></span></span>
		draft <small>{short ? 'link not published' : 'hidden from the blog and rss'}</small>
	</button>
	{#if short}
		<div class="wide">
			<span class="label">file · src/redirects/{item.name || '…'}.md</span>
			<pre class="source">{@html source}</pre>
		</div>
	{/if}
</div>

{#if !short}
	<div class="images">
		<label class="pill square" title="upload images">
			<ImagePlus size={18} />
			<input type="file" accept="image/*" multiple onchange={upload} hidden disabled={!!busy} />
		</label>
		<button class="pill square" title="paste an image" aria-label="paste an image" disabled={!!busy} onclick={pasteImage}><ClipboardPaste size={18} /></button>
		{#each [...shown, ...(showAll ? others : [])] as name (name)}
			<button
				class="thumb"
				title="insert {name} · hold to rename, replace or delete"
				onpointerdown={() => press(name)}
				onpointerup={release}
				onpointerleave={release}
				onpointercancel={release}
				oncontextmenu={(e) => e.preventDefault()}
				onclick={() => (pressed ? (pressed = false) : insert(snippet(name)))}
			>
				{#if isImage(name)}
					<img src={resolve(name)} alt={name} />
				{:else if isAudio(name)}<Music size={18} />{:else if isVideo(name)}<Film size={18} />{:else}<FileIcon size={18} />{/if}
			</button>
		{/each}
		{#if others.length}
			<button class="pill more" onclick={() => (showAll = !showAll)}>
				{showAll ? 'less' : `more (${others.length})`}
			</button>
		{/if}
	</div>
	{#if imageNote}<small class="note image-note">{imageNote}</small>{/if}

	<textarea bind:this={textarea} bind:value={item.body} rows="22" placeholder="write in markdown…"></textarea>

	<div class="previews">
		<Device label="phone" width={390} height={844} bind:frame={phone} />
		<Device label="desktop" width={1280} height={800} bind:frame={desktop} />
	</div>
{/if}

{#if !item.isNew}
	<button class="pill danger delete" disabled={!!busy} onclick={remove}><Trash2 size={18} /> delete</button>
{/if}

<style>
	.bar {
		position: sticky;
		top: calc(var(--top) + 0.75rem);
		z-index: 5;
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.fields {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.wide {
		grid-column: 1 / -1;
	}

	label > span:first-child,
	.label {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	.unsaved {
		width: 2.75rem;
		padding: 0;
		color: #c98a3a;
	}

	.more {
		height: 2.75rem;
		box-shadow: none;
		font-size: 0.85rem;
	}

	.suffix {
		position: relative;
		display: block;
		margin: 0;
	}

	.suffix input {
		padding-right: 3rem;
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

	/* same height as the other fields; the thumbnail and buttons follow it */
	.picker {
		display: flex;
		gap: 0.5rem;
		height: 2.875rem;
	}

	.picker > * {
		height: 100%;
	}

	.picker select {
		flex: 1;
	}

	.square {
		flex: none;
		width: 2.9rem;
		height: auto;
		padding: 0;
		box-shadow: none;
	}

	.note {
		display: block;
		margin-top: 0.4rem;
		color: var(--muted);
	}

	.aliases {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.alias {
		position: relative;
		width: 10rem;
	}

	.alias input {
		padding-right: 2.4rem;
	}

	.icon {
		position: absolute;
		top: 50%;
		right: 0.5rem;
		display: flex;
		padding: 0.3rem;
		border: 0;
		border-radius: 999px;
		color: var(--muted);
		background: none;
		cursor: pointer;
		transform: translateY(-50%);
	}

	.add {
		height: auto;
		padding: 0.7rem 1rem;
		box-shadow: none;
	}

	.switch {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0;
		border: 0;
		font: inherit;
		font-weight: 600;
		color: var(--fg);
		background: none;
		cursor: pointer;
		text-align: left;
	}

	.switch small {
		font-weight: 400;
		color: var(--muted);
	}

	.track {
		position: relative;
		flex: none;
		width: 2.75rem;
		height: 1.6rem;
		border-radius: 999px;
		background: var(--glass);
		border: 1px solid var(--glass-edge);
		box-shadow: inset 0 1px 3px var(--shadow);
		transition: background 0.2s ease;
	}

	.knob {
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 999px;
		background: var(--bg);
		box-shadow: 0 0 8px var(--shadow-soft);
		transition: transform 0.2s ease;
	}

	.switch[aria-checked='true'] .track {
		background: var(--accent);
	}

	.switch[aria-checked='true'] .knob {
		transform: translateX(1.15rem);
	}

	.source {
		margin: 0;
		padding: 1rem 1.2rem;
		border-radius: 0.9rem;
		border: 1px solid var(--glass-edge);
		background: var(--glass);
		font: 14px/1.6 ui-monospace, 'SF Mono', Menlo, monospace;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.source :global(.fence) {
		color: var(--muted);
	}

	.source :global(.key) {
		color: var(--accent);
		font-weight: 600;
	}

	.source :global(.dash) {
		color: var(--soft);
	}

	.source :global(.value) {
		color: #b5734a;
	}

	.images {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.thumb {
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		border: 1px solid var(--glass-edge);
		border-radius: 0.75rem;
		overflow: hidden;
		cursor: pointer;
		background: var(--glass);
	}

	.thumb {
		display: grid;
		place-items: center;
		color: var(--muted);
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.image-note {
		margin: -0.5rem 0 1rem;
	}

	/* one-line fields that wrap and grow instead of scrolling sideways */
	.grow {
		display: block;
		resize: none;
		overflow: hidden;
		font-family: inherit;
		font-size: 16px;
		line-height: 1.4;
	}

	.date {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.6rem;
		width: 100%;
		padding: 0.75rem 1rem;
		text-align: left;
		border: 1px solid var(--glass-edge);
		border-radius: 0.9rem;
		font-size: 16px;
		background: var(--glass);
	}

	.date input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		opacity: 0;
		cursor: pointer;
	}

	.date input::-webkit-calendar-picker-indicator {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		cursor: pointer;
	}

	.images .square {
		height: 2.75rem;
	}

	/* the save icon breathes while saving or uploading */
	:global(.pulse) {
		animation: pulse 1s ease-in-out infinite alternate;
	}

	@keyframes pulse {
		to {
			opacity: 0.3;
		}
	}

	.thumb.cover {
		flex: none;
		width: 2.9rem;
		height: auto;
	}

	.thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.previews {
		display: grid;
		grid-template-columns: 1fr 2.4fr;
		align-items: start;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.delete {
		margin-top: 1.5rem;
	}

	/* on big screens the menu button sits at the top right, so the bar stays below it */
	@media (min-width: 768px) {
		.bar {
			top: calc(var(--top) + 5rem);
		}
	}

	@media (max-width: 600px) {
		.previews {
			grid-template-columns: 1fr;
		}

		.previews > :global(figure:first-child) {
			justify-self: center;
			width: min(20rem, 100%);
		}

		.fields {
			grid-template-columns: 1fr;
		}
	}
</style>
