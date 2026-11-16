<script>
	import { ArrowLeft, ImagePlus, Save, Trash2, Plus, X, Upload, ClipboardPaste } from '@lucide/svelte';
	import Device from './Device.svelte';
	import { urls, serialize } from '../markdown.js';

	/**
	 * @typedef {{ title: string, description: string, image: string, date: string, draft: boolean, alias: string[], redirect: string }} Meta
	 * @type {{
	 *   item: { kind: 'posts' | 'pages' | 'redirects', name: string, from: string, isNew: boolean, meta: Meta, body: string },
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   onsave: () => Promise<void>,
	 *   onupload: (file: File) => Promise<string>,
	 *   ondelete: () => Promise<void>,
	 *   onback: () => void
	 * }}
	 */
	let { item = $bindable(), images, resolve, onsave, onupload, ondelete, onback } = $props();

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

	/** @param {Event & { currentTarget: HTMLInputElement }} e */
	async function upload(e) {
		const files = [...(e.currentTarget.files ?? [])];
		e.currentTarget.value = '';
		await run('uploading…', async () => {
			for (const file of files) {
				const name = await onupload(file);
				added.push(name);
				insert(`\n![](${name})\n`);
				if (!item.meta.image) item.meta.image = name;
			}
		});
	}

	/** uploads a file and makes it the main image */
	async function setCover(/** @type {File} */ file) {
		await run('uploading…', async () => {
			item.meta.image = await onupload(file);
			added.push(item.meta.image);
		});
	}

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
	const shown = $derived(images.filter((name) => used.includes(name)));
	const others = $derived(images.filter((name) => !used.includes(name)));

	/** @param {Event & { currentTarget: HTMLInputElement }} e */
	function uploadCover(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (file) setCover(file);
	}

	async function pasteCover() {
		coverNote = '';
		try {
			for (const entry of await navigator.clipboard.read()) {
				const type = entry.types.find((t) => t.startsWith('image/'));
				if (!type) continue;
				const blob = await entry.getType(type);
				return await setCover(new File([blob], `image-${Date.now()}.${type.split('/')[1]}`, { type }));
			}
			coverNote = 'no image in the clipboard';
		} catch {
			coverNote = "couldn't read the clipboard";
		}
	}

	async function remove() {
		if (!confirm(`delete "${item.meta.title || item.name}"? this can't be undone here.`)) return;
		await run('deleting…', ondelete);
	}
</script>

<div class="bar">
	<button class="pill" onclick={onback}><ArrowLeft size={18} /> back</button>
	<div class="actions">
		<button
			class="pill primary"
			disabled={!!busy || !validName || !item.meta.title.trim() || (short && !item.meta.redirect)}
			onclick={() => run('saving…', onsave)}
		>
			<Save size={18} />
			{busy || 'save'}
		</button>
	</div>
</div>

<div class="fields">
	<label class="wide">
		<span>title</span>
		<input bind:value={item.meta.title} placeholder="title" />
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
			<input type="date" bind:value={item.meta.date} />
		</label>
		<label class="wide">
			<span>description</span>
			<input bind:value={item.meta.description} placeholder="a short summary for lists and rss" />
		</label>
		<div>
			<span class="label">main image</span>
			<div class="picker">
				<select bind:value={item.meta.image}>
					<option value="">none</option>
					{#each images as name}<option value={name}>{name}</option>{/each}
				</select>
				<label class="pill square" title="upload a new main image">
					<Upload size={18} />
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
		<label class="pill">
			<ImagePlus size={18} /> upload image
			<input type="file" accept="image/*" multiple onchange={upload} hidden disabled={!!busy} />
		</label>
		{#each [...shown, ...(showAll ? others : [])] as name (name)}
			<button class="thumb" title="insert {name}" onclick={() => insert(`![](${name})`)}>
				<img src={resolve(name)} alt={name} />
			</button>
		{/each}
		{#if others.length}
			<button class="pill more" onclick={() => (showAll = !showAll)}>
				{showAll ? 'less' : `more (${others.length})`}
			</button>
		{/if}
	</div>

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

	.picker {
		display: flex;
		gap: 0.5rem;
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
		box-shadow: 0 1px 4px var(--shadow);
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
