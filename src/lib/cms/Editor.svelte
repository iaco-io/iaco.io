<script>
	import { ArrowLeft, Eye, Pencil, ImagePlus, Save, Trash2 } from '@lucide/svelte';
	import Article from '../Article.svelte';

	/**
	 * @typedef {{ title: string, description: string, image: string, date: string, draft: boolean }} Meta
	 * @type {{
	 *   item: { kind: 'posts' | 'pages', slug: string, isNew: boolean, meta: Meta, body: string },
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   onsave: () => Promise<void>,
	 *   onupload: (file: File) => Promise<string>,
	 *   ondelete: () => Promise<void>,
	 *   onback: () => void
	 * }}
	 */
	let { item = $bindable(), images, resolve, onsave, onupload, ondelete, onback } = $props();

	let preview = $state(false);
	let busy = $state('');
	/** @type {HTMLTextAreaElement | undefined} */
	let textarea = $state();

	const validSlug = $derived(/^[a-z0-9][a-z0-9-]*$/.test(item.slug));

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
		preview = false;
	}

	/** @param {Event & { currentTarget: HTMLInputElement }} e */
	async function upload(e) {
		const files = [...(e.currentTarget.files ?? [])];
		e.currentTarget.value = '';
		await run('uploading…', async () => {
			for (const file of files) {
				const name = await onupload(file);
				insert(`\n![](${name})\n`);
				if (!item.meta.image) item.meta.image = name;
			}
		});
	}

	async function remove() {
		if (!confirm(`delete "${item.meta.title || item.slug}"? this can't be undone here.`)) return;
		await run('deleting…', ondelete);
	}
</script>

<div class="bar">
	<button class="pill" onclick={onback}><ArrowLeft size={18} /> back</button>
	<div class="actions">
		<button class="pill" onclick={() => (preview = !preview)}>
			{#if preview}<Pencil size={18} /> edit{:else}<Eye size={18} /> preview{/if}
		</button>
		<button
			class="pill primary"
			disabled={!!busy || !validSlug || !item.meta.title.trim()}
			onclick={() => run('saving…', onsave)}
		>
			<Save size={18} />
			{busy || 'save'}
		</button>
	</div>
</div>

{#if preview}
	<div class="preview">
		<Article item={item.meta} body={item.body} {resolve} />
	</div>
{:else}
	<div class="fields">
		<label class="wide">
			<span>title</span>
			<input bind:value={item.meta.title} placeholder="title" />
		</label>
		<label>
			<span>slug {item.kind === 'pages' ? '(iaco.io/slug/)' : '(iaco.io/posts/slug/)'}</span>
			<input bind:value={item.slug} disabled={!item.isNew} placeholder="my-post" />
		</label>
		<label>
			<span>date</span>
			<input type="date" bind:value={item.meta.date} />
		</label>
		<label class="wide">
			<span>description</span>
			<input bind:value={item.meta.description} placeholder="a short summary for lists and rss" />
		</label>
		<label>
			<span>main image</span>
			<select bind:value={item.meta.image}>
				<option value="">none</option>
				{#each images as name}<option value={name}>{name}</option>{/each}
			</select>
		</label>
		<label class="toggle">
			<input type="checkbox" bind:checked={item.meta.draft} />
			<span>draft (hidden from the blog and rss)</span>
		</label>
	</div>

	<div class="images">
		<label class="pill">
			<ImagePlus size={18} /> upload image
			<input type="file" accept="image/*" multiple onchange={upload} hidden disabled={!validSlug || !!busy} />
		</label>
		{#each images as name}
			<button class="thumb" title="insert {name}" onclick={() => insert(`![](${name})`)}>
				<img src={resolve(name)} alt={name} />
			</button>
		{/each}
	</div>

	<textarea bind:this={textarea} bind:value={item.body} rows="22" placeholder="write in markdown…"></textarea>

	{#if !item.isNew}
		<button class="pill danger delete" disabled={!!busy} onclick={remove}><Trash2 size={18} /> delete</button>
	{/if}
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

	label span {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		align-self: end;
		padding-bottom: 0.8rem;
	}

	.toggle input {
		width: 1.2rem;
		height: 1.2rem;
		accent-color: var(--accent);
	}

	.toggle span {
		margin: 0;
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
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.preview {
		padding: 1rem 0 4rem;
	}

	.delete {
		margin-top: 1.5rem;
	}

	@media (max-width: 600px) {
		.fields {
			grid-template-columns: 1fr;
		}
	}
</style>
