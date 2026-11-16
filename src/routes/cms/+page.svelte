<script>
	import '#lib/cms/cms.css';
	import { onMount } from 'svelte';
	import { Plus, LogOut, FileText, File as FileIcon } from '@lucide/svelte';
	import Login from '#lib/cms/Login.svelte';
	import Editor from '#lib/cms/Editor.svelte';
	import { github, rawUrl, utf8ToBase64 } from '#lib/cms/github.js';
	import { encrypt, decrypt } from '#lib/crypto.js';
	import { parse, serialize } from '#lib/markdown.js';

	/** @typedef {'posts' | 'pages'} Kind */
	/** @typedef {{ title: string, description: string, image: string, date: string, draft: boolean }} Meta */
	/** @typedef {{ kind: Kind, slug: string, sha: string, meta: Meta, body: string }} Entry */

	// the token is remembered only in the installed app; in a browser tab it lasts until the tab closes
	const standalone = () =>
		matchMedia('(display-mode: standalone)').matches || /** @type {any} */ (navigator).standalone === true;
	const store = () => (standalone() ? localStorage : sessionStorage);

	/** @type {ReturnType<typeof github> | null} */
	let api = $state(null);
	let kind = $state(/** @type {Kind} */ ('posts'));
	let entries = $state(/** @type {Entry[]} */ ([]));
	let files = $state(/** @type {string[]} */ ([]));
	let loading = $state(false);
	let message = $state('');

	/** @type {{ kind: Kind, slug: string, isNew: boolean, sha?: string, meta: Meta, body: string } | null} */
	let editing = $state(null);

	/** object urls for images uploaded in this session, until github's raw cache catches up */
	let uploaded = $state(/** @type {Record<string, string>} */ ({}));

	const folder = (/** @type {Kind} */ k, /** @type {string} */ slug) => `src/${k}/${slug}/`;
	const toMeta = (/** @type {Record<string, string>} */ m) => ({
		title: m.title ?? '',
		description: m.description ?? '',
		image: m.image ?? '',
		date: m.date ?? '',
		draft: m.draft === 'true'
	});

	const list = $derived(entries.filter((e) => e.kind === kind));
	const images = $derived(
		editing
			? files
					.filter((path) => path.startsWith(folder(editing.kind, editing.slug)) && !path.endsWith('.md'))
					.map((path) => path.slice(folder(editing.kind, editing.slug).length))
					.filter((name) => !name.includes('/'))
			: []
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
		api = client;
		await refresh();
	}

	function logout() {
		try {
			localStorage.removeItem('cms-token');
			sessionStorage.removeItem('cms-token');
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
			const paths = files.filter((p) => /^src\/(posts|pages)\/[^/]+\/index\.md$/.test(p));
			entries = await Promise.all(
				paths.map(async (path) => {
					const [, k, slug] = /** @type {RegExpMatchArray} */ (path.match(/^src\/(\w+)\/([^/]+)\//));
					const { sha, text } = await /** @type {NonNullable<typeof api>} */ (api).read(path);
					const { meta, body } = parse(text);
					return { kind: /** @type {Kind} */ (k), slug, sha, meta: toMeta(meta), body };
				})
			);
			entries.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
		loading = false;
	}

	/** @param {Entry} entry */
	async function open(entry) {
		const body = await decrypt(entry.body).catch(() => entry.body);
		editing = { kind: entry.kind, slug: entry.slug, isNew: false, sha: entry.sha, meta: { ...entry.meta }, body };
	}

	function create() {
		const today = new Date().toISOString().slice(0, 10);
		editing = {
			kind,
			slug: '',
			isNew: true,
			meta: { title: '', description: '', image: '', date: today, draft: true },
			body: ''
		};
	}

	async function save() {
		if (!api || !editing) return;
		const { kind: k, slug, isNew } = editing;
		const path = `${folder(k, slug)}index.md`;
		if (isNew && files.includes(path)) return flash(`${slug} already exists`);
		try {
			const file = serialize(editing.meta, await encrypt(editing.body));
			editing.sha = await api.write(path, utf8ToBase64(file), editing.sha, `cms: ${isNew ? 'add' : 'update'} ${k}/${slug}`);
			editing.isNew = false;
			if (!files.includes(path)) files.push(path);
			flash(editing.meta.draft ? 'saved as draft' : 'saved. the site updates in a minute or two');
			refresh();
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}

	/** @param {File} file */
	async function upload(file) {
		if (!api || !editing) throw new Error('not editing');
		const name = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
		const path = folder(editing.kind, editing.slug) + name;
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
		if (!api || !editing?.sha) return;
		const prefix = folder(editing.kind, editing.slug);
		try {
			for (const f of (await api.list()).filter((f) => f.path.startsWith(prefix))) {
				await api.remove(f.path, f.sha, `cms: delete ${f.path.slice(4)}`);
			}
			editing = null;
			flash('deleted');
			refresh();
		} catch (err) {
			flash(/** @type {Error} */ (err).message);
		}
	}

	/** @param {string} name */
	function resolve(name) {
		if (/^([a-z]+:|\/)/i.test(name) || !editing) return name;
		const path = folder(editing.kind, editing.slug) + name;
		return uploaded[path] ?? rawUrl(path);
	}

	onMount(() => {
		let token = null;
		try {
			token = sessionStorage.getItem('cms-token') ?? (standalone() ? localStorage.getItem('cms-token') : null);
		} catch {}
		if (token) login(token).catch(logout);
	});
</script>

<svelte:head>
	<title>cms — iaco</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="cms">
	{#if !api}
		<Login onlogin={login} />
	{:else if editing}
		<Editor bind:item={editing} {images} {resolve} onsave={save} onupload={upload} ondelete={remove} onback={() => (editing = null)} />
	{:else}
		<header>
			<h1>cms</h1>
			<div class="actions">
				<button class="pill primary" onclick={create}><Plus size={18} /> new {kind === 'posts' ? 'post' : 'page'}</button>
				<button class="pill" onclick={logout} aria-label="log out"><LogOut size={18} /></button>
			</div>
		</header>

		<div class="tabs glass" role="tablist">
			{#each /** @type {Kind[]} */ (['posts', 'pages']) as k}
				<button role="tab" aria-selected={kind === k} class:active={kind === k} onclick={() => (kind = k)}>{k}</button>
			{/each}
		</div>

		{#if loading && !entries.length}
			<p class="empty">loading…</p>
		{:else if !list.length}
			<p class="empty">no {kind} yet.</p>
		{:else}
			<ul>
				{#each list as entry (entry.kind + entry.slug)}
					<li>
						<button class="row glass" onclick={() => open(entry)}>
							{#if entry.kind === 'posts'}<FileText size={20} />{:else}<FileIcon size={20} />{/if}
							<span class="title">{entry.meta.title || entry.slug}</span>
							{#if entry.meta.draft}<span class="badge">draft</span>{/if}
							<span class="date">{entry.meta.date}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	{#if message}<div class="toast glass" role="status">{message}</div>{/if}
</main>

<style>
	main {
		max-width: 52rem;
		margin: 0 auto;
		padding: calc(var(--top) + 3rem) 1.25rem 6rem;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0;
		font-size: 2.4rem;
		letter-spacing: -0.04em;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.tabs {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		margin-bottom: 1.25rem;
		border-radius: 999px;
	}

	.tabs button {
		padding: 0.55rem 1.2rem;
		border: 0;
		border-radius: 999px;
		font: inherit;
		font-weight: 500;
		color: var(--muted);
		background: none;
		cursor: pointer;
	}

	.tabs button.active {
		color: var(--fg);
		background: var(--bg);
		box-shadow: 0 2px 8px var(--shadow);
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
	}

	.title {
		flex: 1;
		font-weight: 600;
	}

	.badge {
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--bg);
		background: var(--soft);
	}

	.date {
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
		white-space: nowrap;
	}
</style>
