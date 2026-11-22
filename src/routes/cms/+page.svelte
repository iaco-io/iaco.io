<script>
	import '#lib/cms/cms.css';
	import { onMount, untrack } from 'svelte';
	import { Star, ListX, PencilLine, ArrowUpNarrowWide, Tag, ListOrdered, ClipboardPaste, Lock, Feather, File as FileIcon, ExternalLink, CloudAlert, Image as ImageIcon, Music, Film } from '@lucide/svelte';
	import Fabs from '#lib/Fabs.svelte';
	import Panel from '#lib/Panel.svelte';
	import ThemeToggle from '#lib/ThemeToggle.svelte';
	import Refresh from '#lib/Refresh.svelte';
	import CreateIcon from '#lib/cms/CreateIcon.svelte';
	import { keyOf, contentOf, listPartials, storePartial, dropPartial } from '#lib/cms/partials.js';
	import Login from '#lib/cms/Login.svelte';
	import Editor from '#lib/cms/Editor.svelte';
	import ImageDialog from '#lib/cms/ImageDialog.svelte';
	import { pasteFile } from '#lib/cms/clipboard.js';
	import { strip } from '#lib/cms/strip.js';
	import { cleanTag, savedCategories, categoryIcons, readCategories, writeCategories, tagUrl, tagName } from '#lib/tags.js';
	import savedOrder from '../../menu.json';
	import MenuOrderDialog from '#lib/cms/MenuOrderDialog.svelte';
	import { menuList } from '#lib/menuList.js';
	import TagsDialog from '#lib/cms/TagsDialog.svelte';
	import DayClock from '#lib/DayClock.svelte';
	import Thumb from '#lib/cms/Thumb.svelte';
	import BeeIcon from '#lib/cms/BeeIcon.svelte';
	import AlphabetDialog from '#lib/cms/AlphabetDialog.svelte';
	import { setAlphabet, alphabet as inAlphabet } from '#lib/tp.js';
	import savedAlphabet from '../../alphabet.json';
	import { github, rawUrl, utf8ToBase64 } from '#lib/cms/github.js';
	import { encrypt, decrypt } from '#lib/crypto.js';
	import { parse, serialize, urls } from '#lib/markdown.js';

	/** @typedef {'posts' | 'pages' | 'redirects'} Kind */
	/** @typedef {Kind | 'media'} Section */
	/** @typedef {{ title: string, description: string, image: string, date: string, draft: boolean, unlisted: boolean, featured: boolean, icon: string, alias: string[], tags: string[], redirect: string }} Meta */
	/** @typedef {{ kind: Kind, name: string, sha: string, meta: Meta, body: string }} Entry */

	// the token is remembered only in the installed app; in a browser tab it lasts until the tab closes
	const standalone = () =>
		matchMedia('(display-mode: standalone)').matches || /** @type {any} */ (navigator).standalone === true;
	const store = () => (standalone() ? localStorage : sessionStorage);

	// in a browser tab the session ends after an hour without activity; the installed app stays logged in
	const IDLE = 60 * 60 * 1000;
	function touch() {
		try {
			if (!standalone()) sessionStorage.setItem('cms-active', String(Date.now()));
		} catch {}
	}
	function expired() {
		if (standalone()) return false;
		try {
			return Date.now() - Number(sessionStorage.getItem('cms-active') ?? 0) > IDLE;
		} catch {
			return false;
		}
	}
	function checkIdle() {
		if (!api || !expired()) return;
		logout();
		flash('logged out after an hour without activity');
	}

	// already logged in: start right away from the saved token and the last list, then check in the background
	const savedToken = (() => {
		try {
			const token = sessionStorage.getItem('cms-token') ?? (standalone() ? localStorage.getItem('cms-token') : null);
			return token && !expired() ? token : null;
		} catch {
			return null;
		}
	})();
	const cached = (() => {
		try {
			return savedToken ? JSON.parse(store().getItem('cms-cache') ?? 'null') : null;
		} catch {
			return null;
		}
	})();

	/** @type {ReturnType<typeof github> | null} */
	let api = $state(savedToken ? github(savedToken) : null);
	let kind = $state(/** @type {Section} */ ('pages'));
	let entries = $state(/** @type {Entry[]} */ (cached?.entries ?? []));
	let files = $state(/** @type {string[]} */ (cached?.files ?? []));
	let loading = $state(false);
	let message = $state('');
	let menu = $state(false);

	const KINDS = /** @type {const} */ ([
		{ kind: 'pages', icon: FileIcon },
		{ kind: 'posts', icon: Feather },
		{ kind: 'redirects', icon: ExternalLink },
		{ kind: 'media', icon: ImageIcon }
	]);

	// the three lists sit side by side; swiping scrolls between them and the toggle follows
	/** @type {HTMLElement | undefined} */
	let track = $state();
	let progress = $state(0);
	const indexOf = (/** @type {Section} */ k) => KINDS.findIndex((x) => x.kind === k);

	function onTrackScroll() {
		if (!track) return;
		progress = track.scrollLeft / track.clientWidth;
		const k = KINDS[Math.round(progress)]?.kind;
		if (k && k !== kind) kind = k;
	}

	/** @param {Section} k */
	function go(k) {
		track?.scrollTo({ left: indexOf(k) * track.clientWidth, behavior: 'smooth' });
	}

	// when the lists appear (login, back from the editor), start at the current section
	$effect(() => {
		if (!track) return;
		const i = indexOf(untrack(() => kind));
		track.scrollLeft = i * track.clientWidth;
		progress = i;
	});

	/** @param {Section} k */
	function show(k) {
		kind = k;
		editing = null;
		menu = false;
		go(k);
	}

	// each list scrolls on its own and keeps its place, also after a trip to the editor
	/** @type {Record<string, HTMLElement | undefined>} */
	let scrollers = $state({});
	/** @type {Record<string, number>} */
	const places = {};
	/** @type {Record<string, number>} */
	let fades = $state({});
	function remember(/** @type {string} */ k, /** @type {HTMLElement} */ el) {
		places[k] = el.scrollTop;
		const fade = Math.round(Math.min(40, Math.max(0, el.scrollTop)));
		if (fades[k] !== fade) fades[k] = fade;
	}
	$effect(() => {
		for (const [k, el] of Object.entries(scrollers)) if (el && places[k]) (el.scrollTop = places[k]), remember(k, el);
	});

	/** `from` is the saved file name, so a changed name renames the file */
	/** @type {{ id?: string, kind: Kind, name: string, from: string, isNew: boolean, sha?: string, meta: Meta, body: string } | null} */
	let editing = $state(null);

	// every change is kept on this device until it's saved; `baseline` is the saved content
	let baseline = '';
	let partials = $state(/** @type {Record<string, any>} */ ({}));

	$effect(() => {
		const current = editing;
		if (!current) return;
		const json = JSON.stringify(current);
		const key = keyOf(current);
		const timer = setTimeout(() => {
			if (contentOf(current) === baseline) dropPartial(key);
			else storePartial(key, json);
			partials = listPartials();
		}, 400);
		return () => clearTimeout(timer);
	});

	const newPartials = $derived(
		Object.entries(partials).filter(([key]) => key.startsWith('new:') && key !== (editing && keyOf(editing)))
	);

	/** object urls for images uploaded in this session, until github's raw cache catches up */
	let uploaded = $state(/** @type {Record<string, string>} */ ({}));

	const MEDIA = 'src/media/';
	const fileOf = (/** @type {Kind} */ k, /** @type {string} */ name) => `src/${k}/${name}.md`;
	const toMeta = (/** @type {Record<string, any>} */ m) => ({
		title: m.title ?? '',
		description: m.description ?? '',
		image: m.image ?? '',
		date: m.date ?? '',
		draft: m.draft === 'true',
		unlisted: m.unlisted === 'true',
		featured: m.featured === 'true',
		icon: m.icon ?? '',
		alias: [m.alias ?? []].flat(),
		tags: [m.tags ?? []].flat(),
		redirect: m.redirect ?? ''
	});

	const images = $derived(
		files.filter((p) => p.startsWith(MEDIA) && !p.endsWith('.md')).map((p) => p.slice(MEDIA.length))
	);

	function flash(/** @type {string} */ text) {
		message = text;
		setTimeout(() => message === text && (message = ''), 4000);
	}

	/** @param {string} token */
	async function login(token) {
		const client = github(token);
		await client.check();
		try {
			store().setItem('cms-token', token);
		} catch {}
		touch();
		api = client;
		await refresh();
	}

	function logout() {
		try {
			for (const s of [localStorage, sessionStorage]) {
				s.removeItem('cms-token');
				s.removeItem('cms-cache');
			}
		} catch {}
		api = null;
		editing = null;
		entries = [];
	}

	// iaco's alphabet (<al>), kept in src/alphabet.json; the newest one is read from github
	const ALPHABET = 'src/alphabet.json';
	let alphabet = $state(savedAlphabet);
	let alphabetOpen = $state(false);
	// re-read when the setup changes
	const alphabetName = $derived((alphabet, inAlphabet('abelus')));

	// list filters: show only drafts, only unlisted pages, only items with unsaved changes on this device
	// (several at once show any of them). posts can also put drafts and unsaved ones first
	let filters = $state({ posts: { draft: false, local: false, featured: false, first: true }, pages: { draft: false, local: false, unlisted: false, first: true } });
	const isLocal = (/** @type {Entry} */ e) => !!partials[`${e.kind}/${e.name}`];
	// the groups when sorting: 0 drafts and unsaved, then (pages only) 1 unlisted, then the rest
	// (posts: drafts and unsaved, then featured, then the rest; pages: drafts and unsaved, unlisted, the rest)
	const GROUPS = { posts: ['draft / local posts', 'featured posts', 'active posts'], pages: ['draft / local pages', 'unlisted pages', 'active pages'] };
	const rank = (/** @type {Entry} */ e) =>
		e.meta.draft || isLocal(e) ? 0 : (e.kind === 'pages' ? e.meta.unlisted : e.meta.featured) ? 1 : 2;
	/** @param {'posts' | 'pages'} k @param {Entry} e */
	function shown(k, e) {
		const f = /** @type {Record<string, boolean>} */ (filters[k]);
		const on = ['draft', 'local', 'unlisted', 'featured'].filter((x) => f[x]);
		if (!on.length) return true;
		return on.some((x) => (x === 'draft' ? e.meta.draft : x === 'local' ? isLocal(e) : x === 'featured' ? e.meta.featured : e.meta.unlisted));
	}

	// tags promoted to categories, kept in src/categories.json; the newest list is read from github
	const CATEGORIES = 'src/categories.json';
	let categories = $state(savedCategories);
	// their own icons
	let categoryLooks = $state({ icons: categoryIcons });
	let tagsOpen = $state(false);

	// the order of the blog menu's links, kept in src/menu.json (by address)
	const MENU = 'src/menu.json';
	let menuOrder = $state(/** @type {string[]} */ (savedOrder));
	let orderOpen = $state(false);
	// the links as the blog's menu has them: home, latest, the used categories, the listed pages
	const menuLinks = $derived.by(() => {
		const live = entries.filter((e) => !e.meta.draft);
		const used = new Set(live.flatMap((e) => e.meta.tags ?? []));
		const links = [
			{ href: '/', label: 'iaco.io' },
			{ href: '/#latest', label: 'latest' },
			...categories.filter((t) => used.has(t)).map((t) => ({ href: tagUrl(t), label: tagName(t) })),
			...live
				.filter((e) => e.kind === 'pages' && !e.meta.unlisted)
				.toSorted((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
				.map((e) => ({ href: urls('pages', e.name).url, label: (e.meta.title || e.name).toLowerCase() }))
		];
		const rank = (/** @type {string} */ href) => (menuOrder.indexOf(href) < 0 ? menuOrder.length : menuOrder.indexOf(href));
		return links.toSorted((a, b) => rank(a.href) - rank(b.href));
	});
	async function saveOrder(/** @type {string[]} */ order) {
		if (!api) return;
		try {
			const sha = (await api.list()).find((f) => f.path === MENU)?.sha;
			await api.write(MENU, utf8ToBase64(JSON.stringify(order, null, '\t') + '\n'), sha, 'cms: menu order');
			menuOrder = order;
			orderOpen = false;
			flash('menu order saved. the site updates in a minute or two');
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}
	/** every tag used in posts and pages, with how many use it */
	const allTags = $derived.by(() => {
		/** @type {Record<string, number>} */
		const count = {};
		for (const e of entries) if (e.kind !== 'redirects') for (const t of e.meta.tags ?? []) count[t] = (count[t] ?? 0) + 1;
		return Object.entries(count).sort(([a], [b]) => a.localeCompare(b));
	});

	/**
	 * saves the tags dialog in one commit: the categories (with their icons) and any renamed tags, which change
	 * in every post and page that uses them (nothing else in those files changes)
	 */
	async function saveCategories(
		/** @type {string[]} */ list,
		/** @type {Record<string, string>} */ icons,
		/** @type {Record<string, string>} */ renames
	) {
		if (!api) return;
		const to = (/** @type {string} */ t) => renames[t] ?? t;
		/** @type {{ path: string, content?: string }[]} */
		const changes = [];
		for (const e of entries) {
			if (e.kind === 'redirects' || !e.meta.tags?.some((t) => renames[t])) continue;
			changes.push({ path: fileOf(e.kind, e.name), content: serialize({ ...e.meta, tags: [...new Set(e.meta.tags.map(to))] }, e.body) });
		}
		/** @type {Record<string, string>} */
		const moved = {};
		for (const [t, icon] of Object.entries(icons)) if (icon) moved[to(t)] ??= icon;
		const file = writeCategories([...new Set(list.map(to))], moved);
		changes.push({ path: CATEGORIES, content: JSON.stringify(file, null, '\t') + '\n' });
		try {
			const renamed = Object.keys(renames).length;
			await api.commit(changes, renamed ? `cms: rename ${Object.entries(renames).map(([a, b]) => `${a} to ${b}`).join(', ')}` : 'cms: update categories');
			({ tags: categories, ...categoryLooks } = readCategories(file));
			tagsOpen = false;
			flash(`${renamed ? 'tags renamed and categories' : 'categories'} saved. the site updates in a minute or two`);
			if (renamed) await refresh();
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}


	async function saveAlphabet(/** @type {typeof savedAlphabet} */ setup) {
		if (!api) return;
		try {
			const sha = (await api.list()).find((f) => f.path === ALPHABET)?.sha;
			await api.write(ALPHABET, utf8ToBase64(JSON.stringify(setup, null, '\t') + '\n'), sha, 'cms: update alphabet');
			alphabet = setup;
			setAlphabet(setup);
			alphabetOpen = false;
			flash('alphabet saved. the site updates in a minute or two');
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}

	async function refresh() {
		if (!api) return;
		loading = true;
		try {
			const tree = await api.list();
			files = tree.map((f) => f.path);
			if (files.includes(CATEGORIES)) {
				api
					.read(CATEGORIES)
					.then(({ text }) => ({ tags: categories, ...categoryLooks } = readCategories(JSON.parse(text))))
					.catch(() => {});
			}
			if (files.includes(ALPHABET)) {
				api
					.read(ALPHABET)
					.then(({ text }) => {
						alphabet = JSON.parse(text);
						setAlphabet(alphabet);
					})
					.catch(() => {});
			}
			const known = new Map(entries.map((e) => [e.sha, e]));
			const items = tree.filter((f) => /^src\/(posts|pages|redirects)\/[^/]+\.md$/.test(f.path) && !f.path.endsWith('/README.md'));
			entries = await Promise.all(
				items.map(async ({ path, sha: blob }) => {
					const [, k, name] = /** @type {RegExpMatchArray} */ (path.match(/^src\/(\w+)\/([^/]+)\.md$/));
					// unchanged files (same sha) are reused, only changed ones are downloaded
					const same = known.get(blob);
					if (same && same.kind === k && same.name === name) return same;
					const { sha, text } = await /** @type {NonNullable<typeof api>} */ (api).read(path);
					const { meta, body } = parse(text);
					return { kind: /** @type {Kind} */ (k), name, sha, meta: toMeta(meta), body };
				})
			);
			try {
				store().setItem('cms-cache', JSON.stringify({ files, entries }));
			} catch {}
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
		loading = false;
	}

	/** @param {Entry} entry */
	async function open(entry, { ignorePartial = false } = {}) {
		const body = await decrypt(entry.body).catch(() => entry.body);
		const saved = { kind: entry.kind, name: entry.name, from: entry.name, isNew: false, sha: entry.sha, meta: { ...entry.meta, alias: [...entry.meta.alias], tags: [...(entry.meta.tags ?? [])] }, body };
		baseline = contentOf(saved);
		const partial = !ignorePartial && partials[`${entry.kind}/${entry.name}`];
		editing = partial ? { ...partial, meta: { tags: [], ...partial.meta }, from: entry.name, isNew: false, sha: entry.sha } : saved;
	}

	/** @param {string} key */
	function openPartial(key) {
		baseline = '';
		editing = { ...partials[key], meta: { tags: [], ...partials[key].meta } };
	}

	function discard() {
		if (!editing) return;
		dropPartial(keyOf(editing));
		partials = listPartials();
		const entry = entries.find((e) => e.kind === editing?.kind && e.name === editing.from);
		if (editing.isNew || !entry) editing = null;
		else open(entry, { ignorePartial: true });
	}

	/** @type {HTMLInputElement | undefined} */
	let mediaInput = $state();

	function create() {
		if (kind === 'media') return mediaInput?.click();
		const today = new Date().toISOString().slice(0, 10);
		baseline = '';
		editing = {
			id: crypto.randomUUID(),
			kind: kind === 'media' ? 'posts' : kind,
			name: '',
			from: '',
			isNew: true,
			meta: { title: '', description: '', image: '', date: kind === 'posts' ? today : '' /* only posts have a date (rss) */, draft: kind !== 'redirects', unlisted: false, featured: false, icon: '', alias: [], tags: [], redirect: '' },
			body: ''
		};
		// an untouched new item isn't worth keeping
		baseline = contentOf(editing);
	}

	async function save() {
		// keep a reference: the editor may be closed (back) while saving
		const current = editing;
		if (!api || !current) return;
		current.meta.alias = current.meta.alias.map((x) => x.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);
		current.meta.tags = [...new Set((current.meta.tags ?? []).map(cleanTag).filter(Boolean))];
		const { kind: k, name, from, isNew } = current;
		const partialKey = keyOf(current);
		const content = contentOf(current);
		const path = fileOf(k, name);
		const renamed = !isNew && name !== from;
		if ((isNew || renamed) && files.includes(path)) return flash(`${name} already exists`);
		try {
			// redirects have no body to encrypt
			const file = serialize(k === 'posts' ? current.meta : { ...current.meta, date: '' }, k === 'redirects' ? '' : await encrypt(current.body));
			const message = `cms: ${isNew ? 'add' : renamed ? `rename ${from} to` : 'update'} ${k}/${name}`;
			const sha = await api.write(path, utf8ToBase64(file), renamed ? undefined : current.sha, message);
			if (renamed && current.sha) {
				await api.remove(fileOf(k, from), current.sha, message);
				files = files.filter((f) => f !== fileOf(k, from));
			}
			current.sha = sha;
			current.from = name;
			current.isNew = false;
			if (!files.includes(path)) files.push(path);
			// what was saved is the new baseline; anything typed meanwhile stays a partial
			dropPartial(partialKey);
			if (editing === current) baseline = content;
			partials = listPartials();
			flash(current.meta.draft ? 'saved as draft' : 'saved. the site updates in a minute or two');
			refresh();
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}

	/** uploads `file` to src/media/`name` (the name may hold folders, like beautiful/cow-and-chicken.jpg) */
	async function upload(/** @type {File} */ original, /** @type {string} */ name) {
		if (!api) throw new Error('not logged in');
		// metadata (camera, place, names…) is removed first; dates are kept
		const file = await strip(original);
		const path = MEDIA + name;
		const base64 = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result).split(',')[1]);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		const existing = (await api.list()).find((f) => f.path === path);
		await api.write(path, base64, existing?.sha, `cms: upload ${path.slice(4)}`);
		uploaded[path] = URL.createObjectURL(file);
		if (!files.includes(path)) files.push(path);
		return name;
	}

	async function remove() {
		const current = editing;
		if (!api || !current?.sha) return;
		try {
			await api.remove(fileOf(current.kind, current.from), current.sha, `cms: delete ${current.kind}/${current.from}`);
			dropPartial(keyOf(current));
			partials = listPartials();
			editing = null;
			flash('deleted');
			refresh();
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}

	const linksTo = (/** @type {string} */ name) => new RegExp(`\\]\\(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[)\\s]`);

	/** titles of the posts and pages that use an image (the one being edited counts as it is now) */
	async function usesOf(/** @type {string} */ name) {
		const found = [];
		const current = editing;
		const same = (/** @type {Entry} */ e) => current && !current.isNew && e.kind === current.kind && e.name === current.from;
		for (const e of entries) {
			if (e.kind === 'redirects' || same(e)) continue;
			const body = await decrypt(e.body).catch(() => e.body);
			if (e.meta.image === name || linksTo(name).test(body + ' ')) found.push(e.meta.title || e.name);
		}
		if (current && (current.meta.image === name || linksTo(name).test(current.body + ' '))) found.unshift(`${current.meta.title || 'this one'} (open now)`);
		return found;
	}

	/**
	 * renames, replaces or deletes a media file in one commit. every post and page that uses it is rewritten to
	 * point to `to` (the new name, or a replacement). 'move' renames the file, 'delete' deletes it, 'keep' leaves it.
	 * @param {string} from @param {string | null} to @param {'move' | 'delete' | 'keep'} mode
	 */
	async function relink(from, to, mode) {
		const move = mode === 'move';
		if (!api) return 0;
		const fromPath = MEDIA + from;
		const tree = await api.list();
		const blob = tree.find((f) => f.path === fromPath);
		if (!blob) throw new Error(`${from} isn't there anymore`);
		if (move && to && tree.some((f) => f.path === MEDIA + to)) throw new Error(`${to} already exists`);
		const swap = (/** @type {string} */ text) => (to ? text.replace(new RegExp(linksTo(from).source, 'g'), (m) => `](${to}${m.at(-1)}`) : text);
		const image = (/** @type {string} */ value) => (value === from ? (to ?? '') : value);
		// keep showing a moved image while github's raw cache catches up
		const preview = move ? (uploaded[fromPath] ?? (await fetch(rawUrl(fromPath)).then((r) => r.blob()).then((b) => URL.createObjectURL(b)).catch(() => undefined))) : undefined;
		/** @type {{ path: string, content?: string, sha?: string | null }[]} */
		const changes = mode === 'keep' ? [] : [{ path: fromPath, sha: null }];
		if (move && to) changes.push({ path: MEDIA + to, sha: blob.sha });
		let count = 0;
		for (const e of entries) {
			if (e.kind === 'redirects') continue;
			const body = await decrypt(e.body).catch(() => e.body);
			const next = swap(body + ' ').slice(0, -1);
			if (e.meta.image !== from && next === body) continue;
			count++;
			changes.push({ path: fileOf(e.kind, e.name), content: serialize({ ...e.meta, image: image(e.meta.image) }, await encrypt(next)) });
		}
		if (!changes.length) return 0;
		await api.commit(changes, `cms: ${move ? `rename ${from} to ${to}` : mode === 'keep' ? `use ${to} instead of ${from}` : `delete ${from}${to ? `, use ${to} instead` : ''}`}`);
		if (preview && to) uploaded[MEDIA + to] = preview;
		// the open item and its saved version follow too, so nothing looks unsaved because of this
		const current = editing;
		if (current) {
			current.meta.image = image(current.meta.image);
			current.body = swap(current.body + ' ').slice(0, -1);
			if (baseline) {
				const saved = JSON.parse(baseline);
				saved.meta.image = image(saved.meta.image);
				saved.body = swap(saved.body + ' ').slice(0, -1);
				baseline = contentOf(saved);
			}
		}
		await refresh();
		if (current && !current.isNew) current.sha = entries.find((e) => e.kind === current.kind && e.name === current.from)?.sha ?? current.sha;
		return count;
	}

	// the media popup (naming, renaming, replacing, deleting), shown above everything
	/** @type {{ props: Record<string, any>, done: (r: any) => void } | null} */
	let dialog = $state(null);
	/** @param {Record<string, any>} props @returns {Promise<any>} */
	const ask = (props) => new Promise((done) => (dialog = { props, done: (r) => ((dialog = null), done(r)) }));

	/** where a post or page can be opened: its number, its url, then its aliases */
	function addresses(/** @type {Entry} */ entry) {
		const { url, id } = urls(entry.kind, entry.name);
		return [id && `/${id}`, url, ...entry.meta.alias.map((x) => `/${x.replace(/^\/+|\/+$/g, '')}`)]
			.filter(Boolean)
			.map((x) => x.replace(/(.)\/$/, '$1'));
	}

	const isImage = (/** @type {string} */ name) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(name);
	const plural = (/** @type {number} */ n) => (n ? `, ${n} ${n === 1 ? 'post' : 'posts'} updated` : '');

	/** rename, replace or delete a media file; returns what happened */
	async function manage(/** @type {string} */ name) {
		const uses = await usesOf(name);
		const result = await ask({ name, src: isImage(name) ? resolve(name) : '', uses, manage: true });
		if (!result) return '';
		message = 'saving…';
		try {
			if (result.rename) return (message = `renamed to ${result.rename}${plural(await relink(name, result.rename, 'move'))}`);
			const to = result.upload ? await upload(result.upload.file, result.upload.name) : (result.replacement ?? null);
			const n = await relink(name, to, result.keep ? 'keep' : 'delete');
			return (message = result.keep ? `replaced with ${to}${plural(n)}` : `deleted ${name}${plural(n)}`);
		} catch (err) {
			return (message = /** @type {Error} */ (err).message);
		} finally {
			setTimeout(() => (message = ''), 4000);
		}
	}

	/** new media from the + button (or the clipboard): name it, then upload */
	async function addMedia(/** @type {Event & { currentTarget: HTMLInputElement }} */ e) {
		await addFiles([...(e.currentTarget.files ?? [])]);
		e.currentTarget.value = '';
	}

	async function pasteMedia() {
		try {
			await addFiles([await pasteFile()]);
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}

	async function addFiles(/** @type {File[]} */ list) {
		for (const file of list) {
			const ext = (file.name.match(/\.[^./]+$/)?.[0]?.toLowerCase() || `.${file.type.split('/')[1] ?? 'bin'}`).replace(/^\.jpeg$/, '.jpg'); // .jpeg uploads become .jpg
			const result = await ask({ name: file.name.replace(/\.[^./]+$/, '').toLowerCase() + ext, src: isImage(ext) ? URL.createObjectURL(file) : '' });
			if (!result) continue;
			try {
				await upload(file, result.rename);
				flash(`uploaded ${result.rename}`);
			} catch (err) {
				flash(/** @type {Error} */ (err).message);
			}
		}
	}

	/** @param {string} name */
	function resolve(name) {
		if (/^([a-z]+:|\/)/i.test(name)) return name;
		const path = MEDIA + name;
		return uploaded[path] ?? rawUrl(path);
	}

	onMount(() => {
		partials = listPartials();
		if (api) {
			refresh();
			api.check().catch((/** @type {Error} */ err) => {
				logout();
				flash(err.message);
			});
		} else logout();

		const timer = setInterval(checkIdle, 60_000);
		addEventListener('pointerdown', touch);
		addEventListener('keydown', touch);
		document.addEventListener('visibilitychange', checkIdle);
		return () => {
			clearInterval(timer);
			removeEventListener('pointerdown', touch);
			removeEventListener('keydown', touch);
			document.removeEventListener('visibilitychange', checkIdle);
		};
	});
</script>

{#snippet mediaList()}
	{#if loading && !files.length}
		<p class="empty">loading…</p>
	{:else if !images.length}
		<p class="empty">no media yet.</p>
	{:else}
		<!-- a gallery: each card is the file (square) with its name below -->
		<ul class="gallery">
			{#each [...images].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) as name (name)}
				<li>
					<button class="card glass" onclick={() => manage(name)}>
						<span class="square">
							{#if isImage(name)}
								<Thumb src={resolve(name)} {name} />
							{:else if /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(name)}<Music size={28} />
							{:else if /\.(mp4|mov|webm|m4v)$/i.test(name)}<Film size={28} />
							{:else}<FileIcon size={28} />{/if}
						</span>
						<span class="caption">{name}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet listOf(/** @type {Section} */ k)}
	{#if k === 'media'}
		<div class="scroll" style:--fade="{fades[k] ?? 0}px" bind:this={scrollers[k]} onscroll={(e) => remember(k, e.currentTarget)}>{@render mediaList()}</div>
	{:else}
	<!-- posts: z to a (newest first); pages and redirects: a to z -->
	{@const all = entries.filter((e) => e.kind === k)}
	{@const items = all
		.filter((e) => k === 'redirects' || shown(k, e))
		.sort((a, b) => (k === 'posts' ? -1 : 1) * a.name.localeCompare(b.name, 'en', { numeric: true }))
		.sort((a, b) => (k !== 'redirects' && filters[k].first ? rank(a) - rank(b) : 0))}
	{@const grouped = k !== 'redirects' && filters[k].first}
	{@const filtering = k !== 'redirects' && Object.entries(filters[k]).some(([x, v]) => v && x !== 'first')}
	{@const fresh = newPartials.filter(([, p]) => p.kind === k && (!filtering || filters[/** @type {'posts' | 'pages'} */ (k)].local))}
	{#if k !== 'redirects' && all.length}
		{@const f = filters[k]}
		<!-- filters, each with how many it matches -->
		<div class="filters">
			{#if k === 'pages'}
				<button class:on={filters.pages.unlisted} title="unlisted" aria-pressed={filters.pages.unlisted} onclick={() => (filters.pages.unlisted = !filters.pages.unlisted)}>
					<ListX size={16} />{all.filter((e) => e.meta.unlisted).length}
				</button>
			{:else if k === 'posts'}
				<button class:on={filters.posts.featured} title="featured" aria-pressed={filters.posts.featured} onclick={() => (filters.posts.featured = !filters.posts.featured)}>
					<Star size={16} />{all.filter((e) => e.meta.featured).length}
				</button>
			{/if}
			<button class:on={f.draft} title="drafts" aria-pressed={f.draft} onclick={() => (f.draft = !f.draft)}>
				<PencilLine size={16} />{all.filter((e) => e.meta.draft).length}
			</button>
			<button class:on={f.local} title="unsaved changes on this device" aria-pressed={f.local} onclick={() => (f.local = !f.local)}>
				<CloudAlert size={16} />{all.filter(isLocal).length + newPartials.filter(([, p]) => p.kind === k).length}
			</button>
			<span class="gap"></span>
			{#if f}
				<button class:on={f.first} title="group: drafts and unsaved first" aria-pressed={f.first} onclick={() => (f.first = !f.first)}>
					<ArrowUpNarrowWide size={16} />
				</button>
			{/if}
		</div>
	{/if}
	<div class="scroll" style:--fade="{fades[k] ?? 0}px" bind:this={scrollers[k]} onscroll={(e) => remember(k, e.currentTarget)}>
	{#if loading && !entries.length}
		<p class="empty">loading…</p>
	{:else if !items.length && !fresh.length}
		<p class="empty">{all.length ? 'nothing matches.' : `no ${k} yet.`}</p>
	{:else}
		<ul>
			<!-- grouped: drafts & unsaved first, then (pages) unlisted, then the rest, each under a heading -->
			{#if grouped}
				<li class="group">{GROUPS[k][0]}</li>
				{#if !fresh.length && !items.some((e) => rank(e) === 0)}<li class="none">none</li>{/if}
			{/if}
			{#each fresh as [key, p] (key)}
				<li>
					<button class="row glass" onclick={() => openPartial(key)}>
						<span class="unsaved"><CloudAlert size={20} /></span>
						<span class="title">{p.meta.title || (p.name ? `/${p.name}` : 'untitled')} <small>new, not saved yet</small></span>
						<span class="marks">
							{#if p.kind === 'pages' && p.meta.unlisted}<span class="mark" title="unlisted"><ListX size={18} /></span>{/if}
							{#if p.kind !== 'redirects' && p.meta.draft}<span class="mark" title="draft"><PencilLine size={18} /></span>{/if}
							{#if p.kind === 'posts' && p.meta.featured}<span class="mark" title="featured"><Star size={18} /></span>{/if}
						</span>
					</button>
				</li>
			{/each}
			{#each items as entry, i (entry.kind + entry.name)}
				{#if grouped}
					<!-- headings (with 'none' for empty groups) before the first item past each group -->
					{#each GROUPS[k].slice(1) as title, g}
						{#if rank(entry) > g && (i === 0 ? true : rank(items[i - 1]) <= g)}
							<li class="group">{title}</li>
							{#if rank(entry) > g + 1}<li class="none">none</li>{/if}
						{/if}
					{/each}
				{/if}
				<!-- draft / unlisted as edited on this device, if there are unsaved changes -->
				{@const now = partials[`${entry.kind}/${entry.name}`]?.meta ?? entry.meta}
				<li>
					<button class="row glass" class:media={entry.kind !== 'redirects'} onclick={() => open(entry)}>
						{#if entry.kind === 'redirects'}
							<ExternalLink size={20} />
						{:else}
							<!-- the main image, or the kind's icon when there is none -->
							<span class="preview">
								{#if entry.meta.image}
									<img src={resolve(entry.meta.image)} alt="" loading="lazy" />
								{:else if entry.kind === 'posts'}<Feather size={20} />{:else}<FileIcon size={20} />{/if}
							</span>
						{/if}
						{#if entry.kind === 'redirects'}
							<span class="title">
								/{entry.name}
								{#if entry.meta.alias.length}
									<small>{entry.meta.alias.map((x) => `/${x.replace(/^\/+|\/+$/g, '')}`).join(' · ')}</small>
								{/if}
							</span>
						{:else}
							<span class="title">
								<span class="name">
									<!-- a page's own icon (not the default one) -->
									{#if entry.kind === 'pages' && now.icon && now.icon !== 'lucide/circle-chevron-right'}
										{#if now.icon.startsWith('lucide/')}
											<span class="page-icon mask" style:--icon="url('/lucide/{now.icon.slice(7)}.svg')"></span>
										{:else}
											<span class="page-icon"><Thumb src={resolve(now.icon)} name={now.icon} size="100%" /></span>
										{/if}
									{/if}
									{entry.meta.title || entry.name}
								</span>
								<small>{addresses(entry).join(' • ')}</small>
							</span>
						{/if}
						<!-- unsaved, unlisted and draft, stacked -->
						<span class="marks">
							{#if partials[`${entry.kind}/${entry.name}`]}
								<span class="unsaved" title="unsaved changes on this device"><CloudAlert size={18} /></span>
							{/if}
							{#if entry.kind === 'pages' && now.unlisted}<span class="mark" title="unlisted"><ListX size={18} /></span>{/if}
							{#if entry.kind !== 'redirects' && now.draft}<span class="mark" title="draft"><PencilLine size={18} /></span>{/if}
							{#if entry.kind === 'posts' && now.featured}<span class="mark" title="featured"><Star size={18} /></span>{/if}
						</span>
						{#if entry.kind === 'redirects'}<span class="detail">{entry.meta.redirect.replace(/^https?:\/\//, '')}</span>{/if}
					</button>
				</li>
			{/each}
			{#if grouped}
				<!-- groups after the last item, all empty -->
				{#each GROUPS[k].slice(1) as title, g}
					{#if !items.some((e) => rank(e) > g)}
						<li class="group">{title}</li>
						<li class="none">none</li>
					{/if}
				{/each}
			{/if}
		</ul>
	{/if}
	</div>
	{/if}
{/snippet}

<svelte:head>
	<title>cms — iaco.io</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="cms" class:centered={!api} class:lists={api && !editing}>
	{#if !api}
		<Login onlogin={login} />
	{:else if editing}
		<Editor bind:item={editing} {images} {resolve} {ask} {manage} {alphabet} {categories} tagsInUse={allTags.map(([t]) => t)} onsave={save} onupload={upload} ondelete={remove} onback={() => (editing = null)} partial={!!partials[keyOf(editing)]} ondiscard={discard} />
	{:else}
		<header>
			<div class="top">
				<h1>iaco.io <small>v {__VERSION__}</small></h1>
				<div class="kinds glass" role="tablist" aria-label="sections" style:--progress={progress}>
					<span class="thumb"></span>
					{#each KINDS as { kind: k, icon: Icon }}
						<button role="tab" aria-selected={kind === k} aria-label={k} class:active={kind === k} onclick={() => go(k)}>
							<Icon size={18} />
						</button>
					{/each}
				</div>
			</div>
			<h2>{kind}</h2>
		</header>

		<!-- swipe left or right to change section -->
		<div class="track" bind:this={track} onscroll={onTrackScroll}>
			{#each KINDS as { kind: k }}
				<section class="list" aria-label={k}>{@render listOf(k)}</section>
			{/each}
		</div>
	{/if}

	{#if message}<div class="toast glass" role="status">{message}</div>{/if}

	{#if tagsOpen}
		<TagsDialog tags={allTags} {categories} icons={categoryLooks.icons} {images} {resolve} onsave={saveCategories} onclose={() => (tagsOpen = false)} />
	{/if}

	{#if orderOpen}
		<MenuOrderDialog links={menuLinks} onsave={saveOrder} onclose={() => (orderOpen = false)} />
	{/if}

	{#if alphabetOpen}
		<AlphabetDialog setup={alphabet} onsave={saveAlphabet} onclose={() => (alphabetOpen = false)} />
	{/if}

	{#if dialog}
		<ImageDialog {...dialog.props} {images} {resolve} ondone={dialog.done} />
	{/if}
</main>
<input type="file" bind:this={mediaInput} onchange={addMedia} multiple hidden />

<!-- not in the editor: it has its own save button there, in the corner -->
{#if api && !editing}
	<Fabs onmenu={() => (menu = true)} target={scrollers[kind]}>
		{#snippet extra()}
			{#if !editing && progress > 2.3}
				<!-- fades in over the last 70% of the slide to the media tab -->
				<button
					class="round create paste"
					style:opacity={Math.min(1, (progress - 2.3) / 0.7)}
					style:pointer-events={progress > 2.65 ? null : 'none'}
					onclick={pasteMedia}
					aria-label="paste media"
				>
					<ClipboardPaste size={22} />
				</button>
			{/if}
			{#if !editing}
				<button class="round create" onclick={create} aria-label={kind === 'media' ? 'upload media' : `new ${kind.slice(0, -1)}`}>
					<CreateIcon {kind} />
				</button>
			{/if}
		{/snippet}
	</Fabs>

	<Panel bind:open={menu} label="cms">
		<!-- the blog's little clock, top left of the menu, level with the close button -->
		<div class="menu-clock"><DayClock inline /></div>
		<ul class="entries" {@attach menuList(() => menu)}>
			<li>
				<button class="entry" onclick={() => ((menu = false), logout())}>
					<Lock size={24} strokeWidth={1.75} /> lock
				</button>
			</li>
			{#each KINDS as { kind: k, icon: Icon }}
				<li>
					<button class="entry" class:active={kind === k && !editing} onclick={() => show(k)}>
						<Icon size={24} strokeWidth={1.75} />
						{k}
					</button>
				</li>
			{/each}
			<li>
				<button class="entry" onclick={() => ((menu = false), (tagsOpen = true))}>
					<Tag size={24} strokeWidth={1.75} />
					tags
				</button>
			</li>
			<li>
				<button class="entry" onclick={() => ((menu = false), (orderOpen = true))}>
					<ListOrdered size={24} strokeWidth={1.75} />
					menu order
				</button>
			</li>
			<li>
				<!-- iaco's alphabet is called abelus, written in itself (a bee) -->
				<button class="entry" onclick={() => ((menu = false), (alphabetOpen = true))}>
					<BeeIcon size={24} strokeWidth={1.75} />
					{alphabetName}
				</button>
			</li>
		</ul>
		{#snippet bottom()}
			<ThemeToggle />
			<Refresh />
		{/snippet}
	</Panel>
{/if}

<style>
	main {
		max-width: 52rem;
		margin: 0 auto;
		padding: calc(var(--top) + 3rem) 1.25rem 6rem;
	}

	/* the login card sits in the middle of the screen */
	main.centered {
		display: grid;
		place-items: center;
		height: 100dvh;
		padding-block: 0;
		/* nothing to scroll on the login screen */
		overflow: hidden;
		touch-action: none;
	}

	:global(html:has(main.centered)) {
		min-height: 0;
	}

	:global(body:has(main.centered)) {
		min-height: 0;
	}

	/* leave room for the menu button at the top right */
	@media (min-width: 768px) {
		main {
			padding-top: calc(var(--top) + 5rem);
		}
	}

	header {
		margin-bottom: 1.5rem;
	}

	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.kinds {
		position: relative;
		display: inline-flex;
		flex: none;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 999px;
	}

	.kinds button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.4rem;
		height: 2.4rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		color: var(--muted);
		background: none;
		cursor: pointer;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	.kinds button {
		position: relative;
	}

	.kinds button.active {
		color: var(--fg);
	}

	/* the highlight slides along with the lists */
	.thumb {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 999px;
		background: var(--bg);
		box-shadow: 0 0 8px var(--shadow-soft);
		transform: translateX(calc(var(--progress) * 2.65rem));
	}

	/* the lists fill the screen below the header; each scrolls on its own */
	/* the page itself never scrolls (nor bounces): only the lists in it */
	:global(html:has(main.lists)),
	:global(html:has(main.lists) body) {
		height: 100%;
		min-height: 0;
		overflow: hidden;
		overscroll-behavior: none;
	}

	main.lists {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		padding-bottom: 0;
		overflow: hidden;
	}

	main.lists header {
		flex: none;
	}

	main.lists .track {
		flex: 1;
		min-height: 0;
		align-items: stretch;
		/* only sideways: a few pixels of up-down here would scroll before the list does */
		overflow-y: hidden;
	}

	main.lists .list {
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding-bottom: 0;
	}

	.scroll {
		flex: 1;
		min-height: 0;
		margin-inline: -0.5rem;
		/* 300px of room after the last item */
		padding: 0.25rem 0.5rem 300px;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	/* the top fades under the filters, the fade growing with the first pixels scrolled (no sudden change) */
	.scroll {
		-webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--fade, 0px));
		mask-image: linear-gradient(to bottom, transparent, #000 var(--fade, 0px));
	}

	.track {
		display: flex;
		align-items: flex-start;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		/* lists run edge to edge; their content keeps the page margins */
		margin-inline: -1.25rem;
	}

	.list {
		flex: 0 0 100%;
		min-height: 60svh;
		padding-inline: 1.25rem;
		/* room to scroll the last items above the floating buttons */
		padding-bottom: 7rem;
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}

	/* the media tab has one more floating button */
	.list:last-child {
		padding-bottom: 11rem;
	}

	h2 {
		margin: 0.4rem 0 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--soft);
	}

	/* the opposite of the glass buttons: solid cream on blue, ink on cream */
	.menu-clock {
		position: absolute;
		top: calc(var(--bleed) + var(--top) + var(--gap));
		left: 1.5rem;
	}

	.create {
		color: var(--bg);
		background: var(--fg);
		border: 0;
	}

	h1 {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 1.7rem;
		letter-spacing: -0.04em;
	}

	h1 small {
		white-space: nowrap;
		position: relative;
		top: 0.15em;
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--muted);
	}

	ul {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 1rem 1.25rem;
		border-radius: 1.25rem;
		font: inherit;
		color: var(--fg);
		text-align: left;
		cursor: pointer;
		/* close to the page background, so the list stays calm */
		background: color-mix(in srgb, var(--bg) 80%, transparent);
	}

	/* the image fills the card's full height on the left; the card's own rounded corners clip it */
	.row.media {
		align-items: stretch;
		min-height: 5rem;
		overflow: hidden;
		padding: 0 1.25rem 0 0;
	}

	.row.media > :not(.preview) {
		align-self: center;
		margin-block: 0.85rem;
	}

	.preview {
		display: grid;
		flex: none;
		place-items: center;
		width: 5rem;
		background: var(--panel);
	}

	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.title {
		flex: 1;
		min-width: 0;
		font-weight: 600;
	}

	.title small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-top: 0.15rem;
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--muted);
	}

	.media .title small {
		margin-top: 0.45rem;
	}

	.unsaved {
		display: flex;
		color: #c98a3a;
	}

	/* two columns on phones, more as the screen widens */
	.gallery {
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		align-items: start;
		gap: 0.6rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 0;
		overflow: hidden;
		border-radius: 1.1rem;
		font: inherit;
		color: var(--fg);
		text-align: left;
		cursor: pointer;
		background: color-mix(in srgb, var(--bg) 80%, transparent);
	}

	.square {
		position: relative;
		display: grid;
		place-items: center;
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		color: var(--muted);
		background: var(--panel);
	}

	.square img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.caption {
		padding: 0.55rem 0.75rem 0.65rem;
		font-size: 0.8rem;
		font-weight: 400;
		overflow-wrap: anywhere;
	}

	.filters {
		display: flex;
		gap: 0.4rem;
		margin: 0 0 0.9rem;
	}

	.filters .gap {
		flex: 1;
	}

	.filters button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		height: 2.1rem;
		padding: 0 0.75rem;
		border: 1px solid var(--glass-edge);
		border-radius: 999px;
		font: inherit;
		font-size: 0.8rem;
		color: var(--muted);
		background: var(--glass);
		cursor: pointer;
	}

	.filters button.on {
		color: var(--bg);
		background: var(--fg);
		border-color: transparent;
	}

	.title .name {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.page-icon {
		position: relative;
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 1.1em;
		height: 1.1em;
		overflow: hidden;
		border-radius: 0.25em;
	}

	.page-icon.mask {
		border-radius: 0;
		background: currentColor;
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
	}

	.group {
		margin: 0.8rem 0 0.1rem 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.none {
		margin: 0 0 0.2rem 0.3rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.group:first-child {
		margin-top: 0;
	}

	.marks {
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
	}

	.marks:empty {
		display: none;
	}

	.mark {
		display: flex;
		flex: none;
		color: var(--muted);
	}

	.badge {
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--bg);
		background: var(--soft);
	}

	.detail {
		flex: 0 1 auto;
		max-width: 45%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.empty {
		color: var(--muted);
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: calc(env(safe-area-inset-bottom) + 1.5rem);
		z-index: 40;
		transform: translateX(-50%);
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 500;
		box-shadow: 0 6px 24px var(--shadow);
		max-width: calc(100vw - 2rem);
		text-align: center;
	}
</style>
