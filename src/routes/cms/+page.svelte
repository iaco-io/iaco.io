<script>
	import '#lib/cms/cms.css';
	import { onMount, untrack } from 'svelte';
	import { ClipboardPaste, Lock, Feather, File as FileIcon, ExternalLink, CloudAlert, Image as ImageIcon, Music, Film } from '@lucide/svelte';
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
	import { github, rawUrl, utf8ToBase64 } from '#lib/cms/github.js';
	import { encrypt, decrypt } from '#lib/crypto.js';
	import { parse, serialize } from '#lib/markdown.js';

	/** @typedef {'posts' | 'pages' | 'redirects'} Kind */
	/** @typedef {Kind | 'media'} Section */
	/** @typedef {{ title: string, description: string, image: string, date: string, draft: boolean, alias: string[], redirect: string }} Meta */
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
	let kind = $state(/** @type {Section} */ ('posts'));
	let entries = $state(/** @type {Entry[]} */ (cached?.entries ?? []));
	let files = $state(/** @type {string[]} */ (cached?.files ?? []));
	let loading = $state(false);
	let message = $state('');
	let menu = $state(false);

	const KINDS = /** @type {const} */ ([
		{ kind: 'posts', icon: Feather },
		{ kind: 'pages', icon: FileIcon },
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
		alias: [m.alias ?? []].flat(),
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

	async function refresh() {
		if (!api) return;
		loading = true;
		try {
			const tree = await api.list();
			files = tree.map((f) => f.path);
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
		const saved = { kind: entry.kind, name: entry.name, from: entry.name, isNew: false, sha: entry.sha, meta: { ...entry.meta, alias: [...entry.meta.alias] }, body };
		baseline = contentOf(saved);
		const partial = !ignorePartial && partials[`${entry.kind}/${entry.name}`];
		editing = partial ? { ...partial, from: entry.name, isNew: false, sha: entry.sha } : saved;
	}

	/** @param {string} key */
	function openPartial(key) {
		baseline = '';
		editing = partials[key];
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
			meta: { title: '', description: '', image: '', date: kind === 'redirects' ? '' : today, draft: kind !== 'redirects', alias: [], redirect: '' },
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
		const { kind: k, name, from, isNew } = current;
		const partialKey = keyOf(current);
		const content = contentOf(current);
		const path = fileOf(k, name);
		const renamed = !isNew && name !== from;
		if ((isNew || renamed) && files.includes(path)) return flash(`${name} already exists`);
		try {
			// redirects have no body to encrypt
			const file = serialize(current.meta, k === 'redirects' ? '' : await encrypt(current.body));
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

	/** uploads `file` to src/media/`name` (the name may hold folders, like animals/panda.jpg) */
	async function upload(/** @type {File} */ file, /** @type {string} */ name) {
		if (!api) throw new Error('not logged in');
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
			const ext = file.name.match(/\.[^./]+$/)?.[0]?.toLowerCase() || `.${file.type.split('/')[1] ?? 'bin'}`;
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
		<ul>
			{#each [...images].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) as name (name)}
				<li>
					<button class="row glass media" onclick={() => manage(name)}>
						<span class="preview">
							{#if isImage(name)}
								<img src={resolve(name)} alt="" loading="lazy" />
							{:else if /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(name)}<Music size={20} />
							{:else if /\.(mp4|mov|webm|m4v)$/i.test(name)}<Film size={20} />
							{:else}<FileIcon size={20} />{/if}
						</span>
						<span class="title">{name.replace(/\.[^./]+$/, '')}</span>
						<span class="detail">{name.match(/\.([^./]+)$/)?.[1] ?? ''}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet listOf(/** @type {Section} */ k)}
	{#if k === 'media'}{@render mediaList()}{:else}
	<!-- posts: z to a (newest first); pages and redirects: a to z -->
	{@const items = entries
		.filter((e) => e.kind === k)
		.sort((a, b) => (k === 'posts' ? -1 : 1) * a.name.localeCompare(b.name, 'en', { numeric: true }))}
	{@const fresh = newPartials.filter(([, p]) => p.kind === k)}
	{#if loading && !entries.length}
		<p class="empty">loading…</p>
	{:else if !items.length && !fresh.length}
		<p class="empty">no {k} yet.</p>
	{:else}
		<ul>
			{#each fresh as [key, p] (key)}
				<li>
					<button class="row glass" onclick={() => openPartial(key)}>
						<span class="unsaved"><CloudAlert size={20} /></span>
						<span class="title">{p.meta.title || (p.name ? `/${p.name}` : 'untitled')} <small>new, not saved yet</small></span>
					</button>
				</li>
			{/each}
			{#each items as entry (entry.kind + entry.name)}
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
							<span class="title">{entry.meta.title || entry.name}</span>
						{/if}
						{#if partials[`${entry.kind}/${entry.name}`]}
							<span class="unsaved" title="unsaved changes on this device"><CloudAlert size={18} /></span>
						{/if}
						{#if entry.meta.draft}<span class="badge">draft</span>{/if}
						<span class="detail">{entry.kind === 'redirects' ? entry.meta.redirect.replace(/^https?:\/\//, '') : entry.name}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{/if}
{/snippet}

<svelte:head>
	<title>cms — iaco</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="cms" class:centered={!api}>
	{#if !api}
		<Login onlogin={login} />
	{:else if editing}
		<Editor bind:item={editing} {images} {resolve} {ask} {manage} onsave={save} onupload={upload} ondelete={remove} onback={() => (editing = null)} partial={!!partials[keyOf(editing)]} ondiscard={discard} />
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

	{#if dialog}
		<ImageDialog {...dialog.props} {images} {resolve} ondone={dialog.done} />
	{/if}
</main>
<input type="file" bind:this={mediaInput} onchange={addMedia} multiple hidden />

{#if api}
	<Fabs onmenu={() => (menu = true)}>
		{#snippet extra()}
			{#if !editing && kind === 'media'}
				<button class="round glass" onclick={pasteMedia} aria-label="paste media"><ClipboardPaste size={22} /></button>
			{/if}
			{#if !editing}
				<button class="round create" onclick={create} aria-label={kind === 'media' ? 'upload media' : `new ${kind.slice(0, -1)}`}>
					<CreateIcon {kind} />
				</button>
			{/if}
		{/snippet}
	</Fabs>

	<Panel bind:open={menu} label="cms">
		<button class="entry" onclick={() => ((menu = false), logout())}>
			<Lock size={24} strokeWidth={2.25} /> lock
		</button>
		<ul class="entries sections">
			{#each KINDS as { kind: k, icon: Icon }}
				<li>
					<button class="entry" class:active={kind === k && !editing} onclick={() => show(k)}>
						<Icon size={24} strokeWidth={2.25} />
						{k}
					</button>
				</li>
			{/each}
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
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}

	h2 {
		margin: 0.4rem 0 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--soft);
	}

	/* sections sit in the middle of the screen */
	:global(.panel) ul.sections {
		position: absolute;
		top: 50%;
		right: 2rem;
		left: 2rem;
		transform: translateY(-50%);
	}

	/* the opposite of the glass buttons: solid cream on blue, ink on cream */
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

	.unsaved {
		display: flex;
		color: #c98a3a;
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
