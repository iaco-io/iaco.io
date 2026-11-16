<script>
	import '#lib/cms/cms.css';
	import { onMount } from 'svelte';
	import { Lock, Feather, File as FileIcon, ExternalLink, CloudAlert } from '@lucide/svelte';
	import Fabs from '#lib/Fabs.svelte';
	import Panel from '#lib/Panel.svelte';
	import ThemeToggle from '#lib/ThemeToggle.svelte';
	import Refresh from '#lib/Refresh.svelte';
	import CreateIcon from '#lib/cms/CreateIcon.svelte';
	import { keyOf, contentOf, listPartials, storePartial, dropPartial } from '#lib/cms/partials.js';
	import Login from '#lib/cms/Login.svelte';
	import Editor from '#lib/cms/Editor.svelte';
	import { github, rawUrl, utf8ToBase64 } from '#lib/cms/github.js';
	import { encrypt, decrypt } from '#lib/crypto.js';
	import { parse, serialize } from '#lib/markdown.js';

	/** @typedef {'posts' | 'pages' | 'redirects'} Kind */
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
	let kind = $state(/** @type {Kind} */ ('posts'));
	let entries = $state(/** @type {Entry[]} */ (cached?.entries ?? []));
	let files = $state(/** @type {string[]} */ (cached?.files ?? []));
	let loading = $state(false);
	let message = $state('');
	let menu = $state(false);

	const KINDS = /** @type {const} */ ([
		{ kind: 'posts', icon: Feather },
		{ kind: 'pages', icon: FileIcon },
		{ kind: 'redirects', icon: ExternalLink }
	]);

	/** @type {{ x: number, y: number } | null} */
	let swipe = null;
	const swipeStart = (/** @type {TouchEvent} */ e) => (swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY });
	function swipeEnd(/** @type {TouchEvent} */ e) {
		if (!swipe) return;
		const dx = e.changedTouches[0].clientX - swipe.x;
		const dy = e.changedTouches[0].clientY - swipe.y;
		swipe = null;
		if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
		const i = KINDS.findIndex((k) => k.kind === kind) + (dx < 0 ? 1 : -1);
		if (KINDS[i]) show(KINDS[i].kind);
	}

	/** @param {Kind} k */
	function show(k) {
		kind = k;
		editing = null;
		menu = false;
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
		Object.entries(partials).filter(([key, p]) => key.startsWith('new:') && p.kind === kind && key !== (editing && keyOf(editing)))
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

	const list = $derived(entries.filter((e) => e.kind === kind));
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
			entries.sort((a, b) => b.name.localeCompare(a.name, 'en', { numeric: true }));
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

	function create() {
		const today = new Date().toISOString().slice(0, 10);
		baseline = '';
		editing = {
			id: crypto.randomUUID(),
			kind,
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

	/** @param {File} file */
	async function upload(file) {
		if (!api || !editing) throw new Error('not editing');
		const name = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
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

<svelte:head>
	<title>cms — iaco</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="cms" class:centered={!api}>
	{#if !api}
		<Login onlogin={login} />
	{:else if editing}
		<Editor bind:item={editing} {images} {resolve} onsave={save} onupload={upload} ondelete={remove} onback={() => (editing = null)} partial={!!partials[keyOf(editing)]} ondiscard={discard} />
	{:else}
		<header>
			<div class="top">
				<h1>iaco.io <small>v {__VERSION__}</small></h1>
				<div class="kinds glass" role="tablist" aria-label="sections">
					{#each KINDS as { kind: k, icon: Icon }}
						<button role="tab" aria-selected={kind === k} aria-label={k} class:active={kind === k} onclick={() => show(k)}>
							<Icon size={18} />
						</button>
					{/each}
				</div>
			</div>
			<h2>{kind}</h2>
		</header>

		<!-- swipe left or right on the list to change section -->
		<div class="lists" ontouchstart={swipeStart} ontouchend={swipeEnd}>

			{#if loading && !entries.length}
				<p class="empty">loading…</p>
			{:else if !list.length && !newPartials.length}
				<p class="empty">no {kind} yet.</p>
			{:else}
				<ul>
					{#each newPartials as [key, p] (key)}
						<li>
							<button class="row glass" onclick={() => openPartial(key)}>
								<span class="unsaved"><CloudAlert size={20} /></span>
								<span class="title">{p.meta.title || (p.name ? `/${p.name}` : 'untitled')} <small>new, not saved yet</small></span>
							</button>
						</li>
					{/each}
					{#each list as entry (entry.kind + entry.name)}
						<li>
							<button class="row glass" onclick={() => open(entry)}>
								{#if entry.kind === 'posts'}<Feather size={20} />{:else if entry.kind === 'pages'}<FileIcon size={20} />{:else}<ExternalLink size={20} />{/if}
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
		</div>
	{/if}

	{#if message}<div class="toast glass" role="status">{message}</div>{/if}
</main>

{#if api}
	<Fabs onmenu={() => (menu = true)}>
		{#snippet extra()}
			{#if !editing}
				<button class="round create" onclick={create} aria-label="new {kind.slice(0, -1)}">
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

	.kinds button.active {
		color: var(--fg);
		background: var(--bg);
		box-shadow: 0 0 8px var(--shadow-soft);
	}

	.lists {
		min-height: 60svh;
		touch-action: pan-y;
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
