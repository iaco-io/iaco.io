<script>
	import { ArrowLeft, CloudAlert, ImagePlus, Save, Trash2, Plus, X, ClipboardPaste, Music, Film, File as FileIcon, Calendar, ChevronDown, Image as ImageIcon, Tag, BookBookmark, Bold, Italic, Highlighter, Link as LinkIcon, LayoutGrid, Table, PencilLine, ListX } from '@lucide/svelte';
	import { cleanTag } from '../tags.js';
	import Device from './Device.svelte';
	import Gallery from './Gallery.svelte';
	import Thumb from './Thumb.svelte';
	import TpKeys from './TpKeys.svelte';
	import { tick, untrack } from 'svelte';
	import { pasteFile } from './clipboard.js';
	import { urls, serialize } from '../markdown.js';

	/**
	 * @typedef {{ title: string, description: string, image: string, date: string, draft: boolean, unlisted?: boolean, icon?: string, alias: string[], redirect: string }} Meta
	 * @type {{
	 *   item: { kind: 'posts' | 'pages' | 'redirects', name: string, from: string, isNew: boolean, meta: Meta, body: string },
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   onsave: () => Promise<void>,
	 *   onupload: (file: File, name: string) => Promise<string>,
	 *   ask: (props: Record<string, any>) => Promise<any>,
	 *   manage: (name: string) => Promise<string>,
	 *   alphabet: Record<string, { to: string, on: boolean }>,
	 *   categories: string[],
	 *   tagsInUse: string[],
	 *   ondelete: () => Promise<void>,
	 *   onback: () => void,
	 *   partial: boolean,
	 *   ondiscard: () => void
	 * }}
	 */
	let { item = $bindable(), images, resolve, ask, manage, alphabet, categories, tagsInUse, onsave, onupload, ondelete, onback, partial, ondiscard } = $props();

	let busy = $state('');
	/** @type {HTMLTextAreaElement | undefined} */
	let textarea = $state();

	// redirects only need a name and a destination
	const short = $derived(item.kind === 'redirects');
	// a number in front, when used, has a fixed width: 001- for posts, 01- for pages
	const digits = $derived(item.kind === 'posts' ? 3 : item.kind === 'pages' ? 2 : 0);
	const badNumber = $derived(!!digits && (item.name.match(/^(\d+)-/)?.[1].length ?? digits) !== digits);
	const validName = $derived(/^[a-z0-9][a-z0-9-]*$/.test(item.name) && !badNumber);
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

	// the toolbar: wraps the selected text (or a placeholder) in markdown, keeping the text selected
	async function wrap(/** @type {string} */ before, /** @type {string} */ after, /** @type {string} */ placeholder) {
		const start = textarea?.selectionStart ?? item.body.length;
		const end = textarea?.selectionEnd ?? start;
		const selected = item.body.slice(start, end) || placeholder;
		item.body = item.body.slice(0, start) + before + selected + after + item.body.slice(end);
		await tick();
		textarea?.focus();
		textarea?.setSelectionRange(start + before.length, start + before.length + selected.length);
	}

	/** puts a block on its own lines, after the line with the cursor */
	async function block(/** @type {string} */ text) {
		const at = textarea?.selectionEnd ?? item.body.length;
		const lineEnd = item.body.indexOf('\n', at);
		const start = lineEnd < 0 ? item.body.length : lineEnd;
		const before = item.body.slice(0, start);
		const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
		item.body = before + lead + text + '\n\n' + item.body.slice(start).replace(/^\n+/, '');
		await tick();
		textarea?.focus();
		const caret = start + lead.length + text.length;
		textarea?.setSelectionRange(caret, caret);
	}

	const COLOURS = ['', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫️', '⚪️', '🟤'];
	let colours = $state(false);
	const keepFocus = (/** @type {Event} */ e) => e.preventDefault();

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

	// the bar (back, unsaved) is fixed where its spot first sits
	/** @type {HTMLElement | undefined} */
	let spot = $state();
	let place = $state({ top: 0, left: 0, width: 0 });
	$effect(() => {
		const measure = () => {
			if (!spot) return;
			const r = spot.getBoundingClientRect();
			place = { top: r.top + scrollY, left: r.left, width: r.width };
		};
		measure();
		addEventListener('resize', measure);
		return () => removeEventListener('resize', measure);
	});

	// slide from the left edge to go back: the back button charges up as the finger moves
	/** @type {{ x: number, y: number, dx: number, horizontal: boolean | null } | null} */
	let edge = $state(null);
	const charge = $derived(edge?.horizontal ? edge.dx / Math.min(innerWidth * 0.2, 120) : 0);
	$effect(() => {
		/** @param {TouchEvent} e */
		const start = (e) => {
			const t = e.touches[0];
			edge = t.clientX < 30 ? { x: t.clientX, y: t.clientY, dx: 0, horizontal: null } : null;
		};
		/** @param {TouchEvent} e */
		const move = (e) => {
			if (!edge) return;
			const t = e.touches[0];
			const dx = t.clientX - edge.x;
			const dy = t.clientY - edge.y;
			if (edge.horizontal === null && Math.hypot(dx, dy) > 5) edge.horizontal = Math.abs(dx) > Math.abs(dy) * 0.6;
			if (edge.horizontal === false) return void (edge = null);
			if (!edge.horizontal) return;
			e.preventDefault();
			edge.dx = Math.max(0, dx);
		};
		const end = () => {
			if (!edge) return;
			const go = charge >= 1;
			edge = null;
			if (go) onback();
		};
		addEventListener('touchstart', start, { passive: true });
		addEventListener('touchmove', move, { passive: false });
		addEventListener('touchend', end);
		addEventListener('touchcancel', end);
		return () => {
			removeEventListener('touchstart', start);
			removeEventListener('touchmove', move);
			removeEventListener('touchend', end);
			removeEventListener('touchcancel', end);
		};
	});
	let gallery = $state(false);
	let iconGallery = $state(false);
	// lucide's icon names, for suggestions in the page icon field (loaded once a page is open)
	let lucideNames = $state(/** @type {string[]} */ ([]));
	$effect(() => {
		if (item.kind !== 'pages' || lucideNames.length) return;
		fetch('/lucide/names.json')
			.then((r) => r.json())
			.then((n) => (lucideNames = n))
			.catch(() => {});
	});

	// the page icon field keeps what is typed, even the default name (which is saved as no icon);
	// it only follows the icon when that changes from elsewhere: reset, a picture from media, another page
	const iconName = (/** @type {string} */ v) => (v && v !== 'circle-chevron-right' ? v : '');
	let iconText = $state('');
	$effect(() => {
		const icon = item.meta.icon ?? '';
		const name = icon.startsWith('lucide/') ? icon.slice(7) : '';
		untrack(() => {
			if (iconName(iconText.trim()) !== name) iconText = name;
		});
	});

	// the sitelen pona keyboard: a word goes into the open <tp> at the cursor, or into a new one
	let keys = $state(false);
	async function tp(/** @type {string} */ word) {
		const body = item.body;
		const start = textarea?.selectionStart ?? body.length;
		const end = textarea?.selectionEnd ?? start;
		const before = body.slice(0, start);
		const inside = before.lastIndexOf('<tp>') > before.lastIndexOf('</tp>');
		let text, caret;
		if (inside) {
			text = (/[\s>]$/.test(before) || !before ? '' : ' ') + word;
			caret = start + text.length;
		} else {
			text = `<tp>${word}</tp>`;
			caret = start + text.length - '</tp>'.length;
		}
		item.body = before + text + body.slice(end);
		await tick();
		textarea?.setSelectionRange(caret, caret);
	}

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
				item: { title: item.meta.title, description: item.meta.description, image: item.meta.image, tags: $state.snapshot(item.meta.tags ?? []) },
				body: item.body,
				alphabet,
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

<!-- back stays where it first appears, also while scrolling -->
<div class="bar" style:top="{place.top}px" style:left="{place.left}px" style:width="{place.width}px">
	<!-- while sliding from the left edge, the ring fills clockwise; full = let go to go back -->
	<button class="pill back" class:charged={charge >= 1} aria-label="back" title="back" onclick={onback}>
		<ArrowLeft size={18} />
		{#if charge > 0}
			<span class="ring" aria-hidden="true">
				<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="21" pathLength="1" stroke-dasharray="{Math.min(charge, 1)} 1" /></svg>
			</span>
		{/if}
	</button>
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
		{#if !item.isNew}
			<button class="pill danger" aria-label="delete" title="delete" disabled={!!busy} onclick={remove}><Trash2 size={18} /></button>
		{/if}
	</div>
</div>

<div class="sheet">
	<div class="spot" bind:this={spot}></div>



	<div class="fields">
		<label class="wide">
			<span>title</span>
			<textarea class="grow" rows="1" bind:value={() => item.meta.title, (v) => (item.meta.title = flat(v))} placeholder="title" onkeydown={oneLine} {@attach fit(() => item.meta.title)}></textarea>
		</label>
		<label>
			<span>file name {badNumber ? `→ number must be ${'0'.repeat(digits - 1)}1-` : links ? `→ ${links}` : ''}</span>
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
						<button
							class="thumb cover"
							title="hold to rename, replace or delete"
							onpointerdown={() => press(item.meta.image)}
							onpointerup={release}
							onpointerleave={release}
							onpointercancel={release}
							oncontextmenu={(e) => e.preventDefault()}
							onclick={() => (pressed = false)}
						>
							<Thumb src={resolve(item.meta.image)} name={item.meta.image} size="60%" />
						</button>
					{/if}
					<button class="choose" title="pick the main image" onclick={() => (gallery = true)}>
						{item.meta.image || 'none'}
						<ChevronDown size={18} />
					</button>
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
		{#if !short}
			<!-- tags sort posts and pages into topics; categories (set in the menu's tags) show a bookmark -->
			<div class="wide">
				<span class="label">tags</span>
				<div class="aliases">
					{#each item.meta.tags, i}
						<div class="alias tag">
							<span class="tag-icon">
								{#if categories.includes(cleanTag(item.meta.tags[i]))}<BookBookmark size={15} />{:else}<Tag size={15} />{/if}
							</span>
							<input bind:value={item.meta.tags[i]} placeholder="tag" list="tags-in-use" autocapitalize="off" />
							<button class="icon" aria-label="remove tag" onclick={() => item.meta.tags.splice(i, 1)}>
								<X size={16} />
							</button>
						</div>
					{/each}
					<button class="pill add" onclick={() => item.meta.tags.push('')}><Plus size={16} /> tag</button>
				</div>
				<datalist id="tags-in-use">
					{#each tagsInUse as t}<option value={t}></option>{/each}
				</datalist>
			</div>
		{/if}
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
		<!-- draft and, for pages, unlisted, side by side -->
		<div class="switches wide">
			<button
				class="switch"
				role="switch"
				aria-checked={item.meta.draft}
				onclick={() => (item.meta.draft = !item.meta.draft)}
			>
				<span class="track"><span class="knob">{#if item.meta.draft}<PencilLine size={14} strokeWidth={2} />{/if}</span></span>
				draft <small>{short ? 'link not published' : 'hidden from the blog and rss'}</small>
			</button>
			{#if item.kind === 'pages'}
				<button
					class="switch"
					role="switch"
					aria-checked={!!item.meta.unlisted}
					onclick={() => (item.meta.unlisted = !item.meta.unlisted)}
				>
					<span class="track"><span class="knob">{#if item.meta.unlisted}<ListX size={14} strokeWidth={2} />{/if}</span></span>
					unlisted <small>not in the menu, still opens by its address</small>
				</button>
			{/if}
		</div>
		{#if item.kind === 'pages' && !item.meta.unlisted}
			<!-- the page's icon in the blog menu: a lucide name, or a picture from the media folder -->
			{@const icon = item.meta.icon || 'lucide/circle-chevron-right'}
			{@const lucide = icon.startsWith('lucide/')}
			<div class="wide">
				<span class="label">page icon · in the menu</span>
				<div class="picker">
					<span class="thumb cover page-icon">
						{#if lucide}
							<span class="lucide" style:--icon="url('/lucide/{icon.slice(7)}.svg')"></span>
						{:else}
							<Thumb src={resolve(icon)} name={icon} size="60%" />
						{/if}
					</span>
					<input
						class="icon-name"
						bind:value={iconText}
						placeholder={lucide ? 'circle-chevron-right' : icon}
						list="lucide-names"
						autocapitalize="off"
						autocorrect="off"
						spellcheck="false"
						aria-label="lucide icon name"
						oninput={(e) => {
							const v = iconName(e.currentTarget.value.trim());
							item.meta.icon = v ? `lucide/${v}` : '';
						}}
					/>
					{#if item.meta.icon}
						<button class="pill square" title="back to the default icon" aria-label="default icon" onclick={() => (item.meta.icon = '')}><X size={18} /></button>
					{/if}
					<button class="pill square" title="pick from media" aria-label="pick from media" onclick={() => (iconGallery = true)}><ImageIcon size={18} /></button>
				</div>
				<datalist id="lucide-names">
					{#each lucideNames as n}<option value={n}></option>{/each}
				</datalist>
				<small class="note">a name from <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer">lucide.dev/icons</a> (lab icons too), or a picture from media</small>
			</div>
		{/if}
		{#if short}
			<div class="wide">
				<span class="label">file · src/redirects/{item.name || '…'}.md</span>
				<pre class="source">{@html source}</pre>
			</div>
		{/if}
	</div>

	{#if !short}
		<div class="images">
			<button class="pill square sp" class:on={keys} onpointerdown={(e) => e.preventDefault()} title="sitelen pona keyboard" aria-label="sitelen pona keyboard" onclick={() => (keys = !keys)}><tp>toki</tp></button>
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
						<Thumb src={resolve(name)} {name} size="60%" />
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

		<div class="toolbar">
			<button class="pill square" title="bold" aria-label="bold" onpointerdown={keepFocus} onclick={() => wrap('**', '**', 'bold')}><Bold size={18} /></button>
			<button class="pill square" title="italic" aria-label="italic" onpointerdown={keepFocus} onclick={() => wrap('*', '*', 'italic')}><Italic size={18} /></button>
			<button class="pill square" class:on={colours} title="highlight" aria-label="highlight" onpointerdown={keepFocus} onclick={() => (colours = !colours)}><Highlighter size={18} /></button>
			<button class="pill square" title="link" aria-label="link" onpointerdown={keepFocus} onclick={() => wrap('[', '](https://)', 'text')}><LinkIcon size={18} /></button>
			<button class="pill square" title="grid of cards" aria-label="grid" onpointerdown={keepFocus} onclick={() => block('```grid\n![](image.jpg)\n[](https://)\ncard 1\ntext\n___\ncard 2\ntext\n```')}><LayoutGrid size={18} /></button>
			<button class="pill square" title="table" aria-label="table" onpointerdown={keepFocus} onclick={() => block('| a | b |\n|---|---|\n| 1 | 2 |')}><Table size={18} /></button>
			{#if colours}
				<!-- a colour for the highlight; the first is the default yellow -->
				<div class="colours">
					{#each COLOURS as c}
						<button
							class="colour"
							title={c || 'default'}
							onpointerdown={keepFocus}
							onclick={() => ((colours = false), wrap(`==${c}`, '==', 'text'))}
						>{c || '=='}</button>
					{/each}
				</div>
			{/if}
		</div>
		<textarea bind:this={textarea} bind:value={item.body} rows="22" placeholder="write in markdown…"></textarea>

		<div class="previews">
			<Device label="phone" width={390} height={844} bind:frame={phone} />
			<Device label="desktop" width={1280} height={800} bind:frame={desktop} />
		</div>
	{/if}



</div>

<!-- save floats above the menu button (above the scroll button on big screens, where the menu is at the top) -->
<button
	class="round save"
	aria-label={busy || 'save'}
	title={busy || 'save'}
	disabled={!!busy || !validName || !item.meta.title.trim() || (short && !item.meta.redirect)}
	onclick={() => run('saving…', onsave)}
>
	<Save size={22} class={busy ? 'pulse' : ''} />
</button>

{#if keys}
	<TpKeys oninsert={tp} onclose={() => (keys = false)} />
{/if}

{#if iconGallery}
	<Gallery
		images={images.filter((n) => /\.(svg|png|jpe?g|webp|avif|gif)$/i.test(n))}
		{resolve}
		current={item.meta.icon ?? ''}
		label="page icon"
		ondone={(name) => ((iconGallery = false), name !== null && (item.meta.icon = name))}
	/>
{/if}

{#if gallery}
	<Gallery images={pictures} {resolve} current={item.meta.image} ondone={(name) => ((gallery = false), name !== null && (item.meta.image = name))} />
{/if}

<style>
	.bar {
		position: fixed;
		z-index: 5;
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	/* keeps the bar's room in the form */
	.spot {
		height: 2.75rem;
		margin-bottom: 1.5rem;
	}

	.back {
		position: relative;
		width: 2.75rem;
		padding: 0;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.back.charged {
		color: var(--bg);
		background: var(--fg);
	}

	.ring {
		position: absolute;
		inset: -1px;
		pointer-events: none;
	}

	.ring svg {
		display: block;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.ring circle {
		fill: none;
		stroke: var(--fg);
		stroke-width: 2;
		stroke-linecap: round;
	}

	.save {
		position: fixed;
		right: var(--gap);
		bottom: calc(env(safe-area-inset-bottom) + var(--gap) + 7.5rem);
		z-index: 15;
		border: 0;
		color: var(--bg);
		background: var(--fg);
	}

	.save:disabled {
		opacity: 0.4;
		cursor: default;
	}

	@media (min-width: 768px) {
		.save {
			bottom: calc(env(safe-area-inset-bottom) + var(--gap) + 3.75rem);
		}
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
		z-index: 1;
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

	.tag input {
		padding-left: 2.2rem;
	}

	.tag-icon {
		position: absolute;
		top: 50%;
		left: 0.8rem;
		display: flex;
		z-index: 1;
		color: var(--muted);
		pointer-events: none;
		transform: translateY(-50%);
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

	.switches {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
	}

	.switch small {
		font-weight: 400;
		color: var(--muted);
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

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}

	.toolbar .square {
		width: 2.6rem;
		height: 2.6rem;
		box-shadow: none;
	}

	.toolbar .on {
		color: var(--bg);
		background: var(--fg);
	}

	.colours {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.1rem;
		width: 100%;
		padding: 0.25rem;
		border-radius: 1.2rem;
		background: var(--glass);
		border: 1px solid var(--glass-edge);
	}

	.colour {
		display: grid;
		place-items: center;
		width: 1.95rem;
		height: 1.95rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--muted);
		background: none;
		cursor: pointer;
	}

	/* the first one, "==", is the default (soft yellow) */
	.colour:first-child {
		font-size: 0.85rem;
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
		position: relative;
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

	.sp tp {
		font-size: 1.35rem;
		line-height: 1;
	}

	.sp.on {
		color: var(--bg);
		background: var(--fg);
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

	.page-icon {
		display: grid;
		place-items: center;
	}

	.page-icon .lucide {
		width: 55%;
		aspect-ratio: 1;
		background: var(--fg);
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
	}

	.icon-name {
		flex: 1;
		min-width: 0;
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
