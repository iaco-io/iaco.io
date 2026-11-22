<script>
	import { ArrowLeft, CloudAlert, ImagePlus, Save, Trash2, Plus, X, ClipboardPaste, Music, Film, File as FileIcon, Calendar, ChevronDown, Image as ImageIcon, Tag, BookBookmark, Bold, Italic, Highlighter, Link as LinkIcon, LayoutGrid, Table, PencilLine, ListX, Images, NotebookPen, ScanEye, Strikethrough, Code, TextQuote, ListTodo, SquareCode, Star } from '@lucide/svelte';
	import { cleanTag } from '../tags.js';
	import Device from './Device.svelte';
	import Gallery from './Gallery.svelte';
	import Thumb from './Thumb.svelte';
	import TpKeys from './TpKeys.svelte';
	import { tick, untrack } from 'svelte';
	import { pasteFile } from './clipboard.js';
	import { highlight } from './highlight.js';
	import { urls, serialize } from '../markdown.js';

	/**
	 * @typedef {{ title: string, description: string, image: string, date: string, draft: boolean, unlisted?: boolean, featured?: boolean, icon?: string, alias: string[], redirect: string }} Meta
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

	/** puts a mark at the start of the line with the cursor (each selected line), or takes it away again */
	async function prefix(/** @type {string} */ mark) {
		const start = textarea?.selectionStart ?? item.body.length;
		const end = textarea?.selectionEnd ?? start;
		const from = item.body.lastIndexOf('\n', start - 1) + 1;
		const lines = item.body.slice(from, end).split('\n');
		const on = lines.every((l) => l.startsWith(mark));
		const changed = lines.map((l) => (on ? l.slice(mark.length) : mark + l)).join('\n');
		item.body = item.body.slice(0, from) + changed + item.body.slice(end);
		await tick();
		textarea?.focus();
		const caret = from + changed.length;
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
			edge = t.clientX < 30 && pos === 0 ? { x: t.clientX, y: t.clientY, dx: 0, horizontal: null } : null;
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

	// the body has its own screen, right of the form, like the cms's tabs: swipe left to it and right back
	// (or its buttons). it is styled as markdown (marks still shown): the title on top, the text, and the
	// toolbar at the bottom; images and sitelen pona open above the toolbar
	let pos = $state(0); // 0 the form, 1 the body; in between while dragging
	let dragging = $state(false);
	const focus = $derived(pos > 0 || dragging);
	let tray = $state(/** @type {'' | 'images'} */ (''));
	const styled = $derived(focus ? highlight(item.body) : '');
	// back to the form; the keyboard stays up (and the text with it, out of sight) until a tap elsewhere
	function leave() {
		pos = 0;
		keys = colours = false;
		tray = '';
	}
	let typing = $state(false); // the text has the keyboard
	// a tap that would take the keyboard from the text (ios moves focus on tap) becomes a plain click instead
	function stayTyping(/** @type {TouchEvent} */ e) {
		if (!typing || !e.cancelable) return;
		e.preventDefault();
		/** @type {HTMLElement} */ (e.currentTarget).click();
	}
	// in the text while typing, ios moves the cursor after a touch is held a moment, and drags a selection's
	// handles: those touches are the cursor's, not a swipe or a scroll to stop
	const cursorTouch = (/** @type {EventTarget | null} */ target, /** @type {number} */ held) =>
		typing && target === textarea && (held > 280 || textarea.selectionStart !== textarea.selectionEnd);
	const live = $derived(focus || typing);
	// it fits the visible part of the screen, so the toolbar stays right above the phone keyboard;
	// the page behind doesn't scroll
	let view = $state({ top: 0, height: 0, keyboard: false });
	$effect(() => {
		if (!focus) return;
		const vv = window.visualViewport;
		const fit = () => (view = { top: vv?.offsetTop ?? 0, height: vv?.height ?? innerHeight, keyboard: !!vv && vv.height < innerHeight - 120 });
		fit();
		vv?.addEventListener('resize', fit);
		vv?.addEventListener('scroll', fit);
		return () => {
			vv?.removeEventListener('resize', fit);
			vv?.removeEventListener('scroll', fit);
		};
	});
	// the page behind is held still while the body's screen is open (overflow alone doesn't stop ios from
	// scrolling it while the keyboard is up): it is pinned where it was, and put back on leaving
	$effect(() => {
		if (pos !== 1) return;
		const y = scrollY;
		const body = document.body.style;
		Object.assign(body, { position: 'fixed', top: `${-y}px`, left: '0', right: '0', overflow: 'hidden' });
		return () => {
			Object.assign(body, { position: '', top: '', left: '', right: '', overflow: '' });
			scrollTo({ top: y, behavior: 'instant' }); // not the page's smooth scrolling, which would roll down from the top
		};
	});
	// with the keyboard up, ios scrolls the whole screen when a finger drags anywhere that can't scroll itself.
	// so on the body's screen a drag only moves something that can still scroll that way (the text, the rows,
	// the keys); anything else is held still
	/** @type {HTMLElement | undefined} */
	let writer = $state();
	$effect(() => {
		if (!writer) return;
		let y = 0;
		let t0 = 0;
		let free = /** @type {boolean | null} */ (null); // the cursor's touch: left alone
		const start = (/** @type {TouchEvent} */ e) => ((y = e.touches[0].clientY), (t0 = e.timeStamp), (free = null));
		const move = (/** @type {TouchEvent} */ e) => {
			free ??= cursorTouch(e.target, e.timeStamp - t0);
			if (free) return;
			const dy = y - e.touches[0].clientY; // > 0: the content would move up
			y = e.touches[0].clientY;
			for (let el = /** @type {HTMLElement | null} */ (e.target); el && el !== writer; el = el.parentElement) {
				const { overflowY, overflowX } = getComputedStyle(el);
				if (/auto|scroll/.test(overflowX) && el.scrollWidth > el.clientWidth && Math.abs(dy) < 2) return;
				if (!/auto|scroll/.test(overflowY) || el.scrollHeight <= el.clientHeight) continue;
				const room = dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
				if (room) return;
				break;
			}
			if (e.cancelable) e.preventDefault();
		};
		writer.addEventListener('touchstart', start, { passive: true });
		writer.addEventListener('touchmove', move, { passive: false });
		return () => {
			writer?.removeEventListener('touchstart', start);
			writer?.removeEventListener('touchmove', move);
		};
	});

	// buttons under the text keep the keyboard up: ios moves the focus on a tap even when pointerdown is
	// stopped, so a tap there (not a drag) becomes a plain click, which leaves the focus in the text
	$effect(() => {
		if (!writer) return;
		/** @type {{ x: number, y: number } | null} */
		let down = null;
		const start = (/** @type {TouchEvent} */ e) => (down = { x: e.touches[0].clientX, y: e.touches[0].clientY });
		const end = (/** @type {TouchEvent} */ e) => {
			const t = e.changedTouches[0];
			const button = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('.toolbar button, .media-pop button, .media-pop label, .tray button, .to-previews'));
			if (!button || !typing || !down || Math.hypot(t.clientX - down.x, t.clientY - down.y) > 10) return;
			e.preventDefault();
			button.click();
		};
		writer.addEventListener('touchstart', start, { passive: true });
		writer.addEventListener('touchend', end, { passive: false });
		return () => {
			writer?.removeEventListener('touchstart', start);
			writer?.removeEventListener('touchend', end);
		};
	});

	// the swipe between the two screens follows the finger; a flick or past half way goes over
	$effect(() => {
		/** @type {{ x: number, y: number, from: number, horizontal: boolean | null, lastX: number, lastT: number, speed: number, t0: number, target: Element } | null} */
		let s = null;
		/** @param {TouchEvent} e */
		const start = (e) => {
			const { clientX: x, clientY: y } = e.touches[0];
			const target = /** @type {Element} */ (e.target);
			// not from the rows that scroll sideways, nor the left edge of the form (that goes back to the list)
			if (target.closest?.('.toolbar, .media-pop, .tray, .colours, .dialog, dialog') || (pos === 0 && x < 30)) return void (s = null);
			s = { x, y, from: pos, horizontal: null, lastX: x, lastT: e.timeStamp, speed: 0, t0: e.timeStamp, target };
		};
		/** @param {TouchEvent} e */
		const move = (e) => {
			if (!s) return;
			const { clientX: x, clientY: y } = e.touches[0];
			const dx = x - s.x;
			if (s.horizontal === null && Math.hypot(dx, y - s.y) > 6) {
				if (cursorTouch(s.target, e.timeStamp - s.t0)) return void (s = null);
				s.horizontal = Math.abs(dx) > Math.abs(y - s.y);
			}
			if (s.horizontal === false) return void (s = null);
			if (!s.horizontal) return;
			const dt = e.timeStamp - s.lastT;
			if (dt > 0) s.speed = s.speed * 0.5 + ((x - s.lastX) / dt) * 0.5;
			s.lastX = x;
			s.lastT = e.timeStamp;
			const next = Math.min(1, Math.max(0, s.from - dx / innerWidth));
			if (next === s.from && !dragging) return;
			e.preventDefault();
			dragging = true;
			pos = next;
		};
		const end = (/** @type {TouchEvent} */ e) => {
			if (!s) return;
			// a tap on the form (not a drag) puts away the keyboard left up from the text
			const t = e.changedTouches?.[0];
			if (!dragging && s.from === 0 && pos === 0 && typing && t && Math.hypot(t.clientX - s.x, t.clientY - s.y) < 10) textarea?.blur();
			if (dragging) {
				const to = Math.abs(s.speed) > 0.35 ? (s.speed < 0 ? 1 : 0) : Math.round(pos);
				dragging = false;
				if (to) pos = 1;
				else leave();
			}
			s = null;
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
<div class="bar" class:dragging style:translate={pos ? `${-pos * 100}vw 0` : null} style:top="{place.top}px" style:left="{place.left}px" style:width="{place.width}px">
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

<div class="sheet" class:dragging style:translate={pos ? `${-pos * 100}vw 0` : null}>
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
		{#if item.kind === 'posts'}
			<label>
				<span>date (rss only)</span>
				<!-- shown as 2026-Nov-16; the real (invisible) date field on top opens the picker -->
				<span class="date">
					<Calendar size={18} />
					{pretty(item.meta.date) || 'no date'}
					<input type="date" bind:value={item.meta.date} />
				</span>
			</label>
		{/if}
		{#if !short}
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
		<!-- draft and, for pages, unlisted (for posts, featured), side by side -->
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
			{:else if item.kind === 'posts'}
				<button
					class="switch"
					role="switch"
					aria-checked={!!item.meta.featured}
					onclick={() => (item.meta.featured = !item.meta.featured)}
				>
					<span class="track"><span class="knob">{#if item.meta.featured}<Star size={14} strokeWidth={2} />{/if}</span></span>
					featured
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

	<!-- save, centred under the fields -->
	<button
		class="pill primary save"
		disabled={!!busy || !validName || !item.meta.title.trim() || (short && !item.meta.redirect)}
		onclick={() => run('saving…', onsave)}
	>
		<Save size={18} class={busy ? 'pulse' : ''} />
		{busy || 'save'}
	</button>

	{#if !short}
		<div class="previews">
			<Device label="phone" width={390} height={844} bind:frame={phone} />
			<Device label="desktop" width={1280} height={800} bind:frame={desktop} />
		</div>
	{/if}



</div>

	{#if !short}
		<!-- the body's screen: comes in from the right -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={writer}
			class="writer"
			class:shown={live}
			class:dragging
			class:keyboard={view.keyboard}
			inert={!live}
			style:top="{view.top}px"
			style:height={view.height ? `${view.height}px` : null}
			style:transform="translateX({(1 - pos) * 100}%)"
			onkeydown={(e) => e.key === 'Escape' && leave()}
		>
		<div class="focus-top">
			<span class="focus-title">{item.meta.title || 'untitled'}</span>
			<button class="pill square" title="back to the form" aria-label="back to the form" onclick={() => (leave(), textarea?.blur())}><X size={18} /></button>
		</div>
		{#snippet thumb(/** @type {string} */ name)}
			<button
				class="thumb"
				title="insert {name} · hold to rename, replace or delete"
				onpointerdown={() => press(name)}
				onpointerup={release}
				onpointerleave={release}
				onpointercancel={release}
				oncontextmenu={(e) => e.preventDefault()}
				onclick={() => (pressed ? (pressed = false) : (insert(snippet(name)), (tray = '')))}
			>
				{#if isImage(name)}
					<Thumb src={resolve(name)} {name} size="60%" />
				{:else if isAudio(name)}<Music size={18} />{:else if isVideo(name)}<Film size={18} />{:else}<FileIcon size={18} />{/if}
			</button>
		{/snippet}
		{#if tray === 'images'}
			<!-- a small popup above the toolbar: the other media as a grid; at the bottom upload, paste and this
			     post's own (tap to insert, hold to rename, replace or delete) -->
			<div class="media-pop glass" role="dialog" aria-label="media">
				{#if others.length}
					<div class="media-grid">
						{#each others as name (name)}{@render thumb(name)}{/each}
					</div>
				{/if}
				<div class="images">
					<label class="pill square" title="upload images">
						<ImagePlus size={18} />
						<input type="file" accept="image/*" multiple onchange={upload} hidden disabled={!!busy} />
					</label>
					<button class="pill square" title="paste an image" aria-label="paste an image" disabled={!!busy} onclick={pasteImage}><ClipboardPaste size={18} /></button>
					{#if shown.length}<span class="divider" aria-hidden="true"></span>{/if}
					{#each shown as name (name)}{@render thumb(name)}{/each}
				</div>
			</div>
		{/if}
		{#if imageNote}<small class="note image-note">{imageNote}</small>{/if}
		{#if keys}
			<div class="tray"><TpKeys docked oninsert={tp} onclose={() => (keys = false)} /></div>
		{/if}
		{#if colours}
			<!-- a colour for the highlight, above the toolbar like the images and the keys; the first is the default yellow -->
			<div class="tray">
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
			</div>
		{/if}

		<div class="toolbar">
				<button class="pill square" class:on={tray === 'images'} title="images" aria-label="images" onpointerdown={keepFocus} onclick={() => ((tray = tray === 'images' ? '' : 'images'), (keys = false), (colours = false))}><Images size={18} /></button>
				<button class="pill square sp" class:on={keys} title="sitelen pona keyboard" aria-label="sitelen pona keyboard" onpointerdown={keepFocus} onclick={() => ((keys = !keys), (tray = ''), (colours = false))}><tp>toki</tp></button>
			<button class="pill square" title="bold" aria-label="bold" onpointerdown={keepFocus} onclick={() => wrap('**', '**', 'bold')}><Bold size={18} /></button>
			<button class="pill square" title="italic" aria-label="italic" onpointerdown={keepFocus} onclick={() => wrap('*', '*', 'italic')}><Italic size={18} /></button>
			<button class="pill square" title="strike through" aria-label="strike through" onpointerdown={keepFocus} onclick={() => wrap('~~', '~~', 'text')}><Strikethrough size={18} /></button>
			<button class="pill square" class:on={colours} title="highlight" aria-label="highlight" onpointerdown={keepFocus} onclick={() => ((colours = !colours), (keys = false), (tray = ''))}><Highlighter size={18} /></button>
			<button class="pill square" title="code" aria-label="code" onpointerdown={keepFocus} onclick={() => wrap('`', '`', 'code')}><Code size={18} /></button>
			<button class="pill square" title="link" aria-label="link" onpointerdown={keepFocus} onclick={() => wrap('[', '](https://)', 'text')}><LinkIcon size={18} /></button>
			<button class="pill square" title="quote" aria-label="quote" onpointerdown={keepFocus} onclick={() => prefix('> ')}><TextQuote size={18} /></button>
			<button class="pill square" title="task" aria-label="task" onpointerdown={keepFocus} onclick={() => prefix('- [ ] ')}><ListTodo size={18} /></button>
			<button class="pill square" title="code block" aria-label="code block" onpointerdown={keepFocus} onclick={() => block('```\ncode\n```')}><SquareCode size={18} /></button>
			<button class="pill square" title="grid of cards" aria-label="grid" onpointerdown={keepFocus} onclick={() => block('```grid\n![](image.jpg)\n[](https://)\ncard 1\ntext\n___\ncard 2\ntext\n```')}><LayoutGrid size={18} /></button>
			<button class="pill square" title="table" aria-label="table" onpointerdown={keepFocus} onclick={() => block('| a | b |\n|---|---|\n| 1 | 2 |')}><Table size={18} /></button>
		</div>
		<div class="text">
			<div class="paper">
				<!-- the styled copy sets the height; the textarea lies over all of it (not just the visible part), so
				     a tap anywhere lands on the same letter in both -->
				<div class="layers">
				<pre class="styled" aria-hidden="true">{@html styled}</pre>
				<textarea bind:this={textarea} bind:value={item.body} placeholder="write in markdown…" onfocus={() => (typing = true)} onblur={() => (typing = false)}></textarea>
				</div>
			</div>
			<button class="pill primary to-previews" title="see the previews" aria-label="see the previews" onpointerdown={keepFocus} onclick={leave}><ScanEye size={22} /></button>
		</div>

		</div>
	{/if}

<!-- the markdown body's screen, from the bottom right corner -->
{#if !short}
	<button class="round glass to-body" aria-label="edit markdown body" title="edit markdown body" onpointerdown={keepFocus} ontouchend={stayTyping} onclick={() => (pos = 1)}>
		<NotebookPen size={22} />
	</button>
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
		display: flex;
		margin: 1.5rem auto 0;
	}

	.to-body {
		position: fixed;
		right: var(--gap);
		bottom: calc(env(safe-area-inset-bottom) + var(--gap));
		z-index: 15;
	}

	.save:disabled {
		opacity: 0.4;
		cursor: default;
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

	/* focus mode: the text fills the screen; title on top, then the text, the open tray and the toolbar */
	.writer {
		position: fixed;
		left: 0;
		right: 0;
		z-index: 60;
		height: 100dvh;
		visibility: hidden;
		transition:
			transform 0.35s ease,
			visibility 0s linear 0.35s;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: calc(env(safe-area-inset-top) + 0.6rem) 0.75rem calc(env(safe-area-inset-bottom) + 0.6rem);
		background: var(--bg);
	}

	/* stays above the previews, so they can be closed from here */
	/* the bar ios shows above the keyboard (arrows, done) is see-through: the screen's colour carries on
	   below it, so the page doesn't show behind */
	.writer::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		height: 100vh;
		background: var(--bg);
	}

	.writer.keyboard {
		padding-bottom: 0.35rem;
	}

	.writer.shown {
		visibility: visible;
		transition: transform 0.35s ease;
	}

	.writer.dragging,
	.sheet.dragging,
	.bar.dragging {
		transition: none;
	}

	.sheet,
	.bar {
		transition: translate 0.35s ease;
	}

	.focus-top {
		position: relative;
		z-index: 62;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.focus-top .square {
		width: 2.6rem;
		height: 2.6rem;
		box-shadow: none;
	}

	.focus-title {
		flex: 1;
		overflow: hidden;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: var(--muted);
	}

	/* the text and the eye in its corner */
	.writer .text {
		order: 1;
		flex: 1;
		position: relative;
		display: flex;
		min-height: 0;
	}

	.to-previews {
		position: absolute;
		right: 0.75rem;
		bottom: 0.75rem;
		width: 3rem;
		height: 3rem;
		box-shadow: 0 4px 14px var(--shadow);
	}

	.writer .paper {
		flex: 1;
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid var(--glass-edge);
		border-radius: 0.9rem;
		background: var(--glass);
	}

	/* the media popup, above the toolbar */
	.media-pop {
		order: 2;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		max-height: 45%;
		padding: 0.6rem;
		border-radius: 1.2rem;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.4rem, 1fr));
		gap: 0.45rem;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.media-grid .thumb {
		width: auto;
		height: auto;
		aspect-ratio: 1;
	}

	/* upload, paste, then this post's own: one row that scrolls sideways */
	.media-pop .images {
		flex: none;
		flex-wrap: nowrap;
		margin: 0;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.media-pop .images > :global(*) {
		flex: none;
	}

	.divider {
		width: 1px;
		height: 1.8rem;
		background: var(--glass-edge);
	}

	.writer .tray {
		order: 3;
	}

	.writer .toolbar {
		order: 4;
		flex-wrap: nowrap;
		margin: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.writer .toolbar {
		gap: 0.3rem;
	}

	.writer .toolbar .square {
		flex: none;
		width: 2.25rem;
		height: 2.25rem;
	}

	/* the styled copy lies exactly under the textarea, letter for letter: same font, size, padding and wrapping;
	   the textarea's own letters are invisible, its caret and selection stay */
	.layers {
		position: relative;
		min-height: 100%;
	}

	.styled,
	.writer textarea {
		margin: 0;
		padding: 0.9rem 1rem 40vh;
		border: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 15px;
		line-height: 1.6;
		letter-spacing: normal;
		tab-size: 4;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		word-break: normal;
	}

	.styled {
		min-height: 100%;
		color: var(--fg);
	}

	.writer textarea {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		resize: none;
		overflow: hidden;
		border-radius: 0;
		color: transparent;
		-webkit-text-fill-color: transparent;
		caret-color: var(--fg);
		background: none;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}

	.styled :global(.m) {
		color: var(--soft);
		font-weight: 400;
	}

	.styled :global(b) {
		font-weight: 700;
	}

	.styled :global(.h) {
		font-weight: 700;
		color: var(--accent);
	}

	.styled :global(.link) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.styled :global(.quote) {
		color: var(--muted);
		font-style: italic;
	}

	.styled :global(code),
	.styled :global(.code),
	.styled :global(.fence) {
		color: #b5734a;
		font: inherit;
	}

	.styled :global(mark) {
		--mark: rgb(255 214 102 / 0.55);
		color: inherit;
		border-radius: 0.2em;
		background: var(--mark);
	}
	.styled :global(mark.red) { --mark: rgb(255 107 107 / 0.42); }
	.styled :global(mark.orange) { --mark: rgb(255 159 67 / 0.45); }
	.styled :global(mark.yellow) { --mark: rgb(255 214 102 / 0.55); }
	.styled :global(mark.green) { --mark: rgb(102 204 136 / 0.42); }
	.styled :global(mark.blue) { --mark: rgb(95 143 230 / 0.4); }
	.styled :global(mark.purple) { --mark: rgb(170 120 230 / 0.4); }
	.styled :global(mark.black) { --mark: rgb(20 20 30 / 0.85); color: #f4ecdc; }
	.styled :global(mark.white) { --mark: rgb(255 255 255 / 0.9); color: #0b1f38; }
	.styled :global(mark.brown) { --mark: rgb(165 110 70 / 0.42); }

	.previews {
		display: grid;
		grid-template-columns: 1fr 2.4fr;
		align-items: start;
		gap: 1rem;
		margin-top: 1.5rem;
		/* room below the last preview */
		padding-bottom: 200px;
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
