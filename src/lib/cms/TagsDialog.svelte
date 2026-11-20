<script>
	// every tag used in posts and pages, each with a switch: on promotes the tag to a category
	// (shown with a bookmark instead of a tag, and listed in the blog's menu)
	import { Tag, BookBookmark, Save, Undo2 } from '@lucide/svelte';

	/**
	 * @type {{
	 *   tags: [string, number][],
	 *   categories: string[],
	 *   onsave: (categories: string[]) => Promise<void>,
	 *   onclose: () => void
	 * }}
	 */
	let { tags, categories, onsave, onclose } = $props();

	// a copy to edit; nothing changes until saved
	let picked = $state(new Set(categories));
	let saving = $state(false);

	function toggle(/** @type {string} */ tag) {
		const next = new Set(picked);
		next.has(tag) ? next.delete(tag) : next.add(tag);
		picked = next;
	}

	async function save() {
		saving = true;
		try {
			// a category whose tag is no longer used is dropped
			await onsave(tags.map(([t]) => t).filter((t) => picked.has(t)));
		} finally {
			saving = false;
		}
	}

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	$effect(() => dialog?.showModal());

	function outside(/** @type {MouseEvent} */ e) {
		if (e.target !== dialog || !dialog) return;
		const r = dialog.getBoundingClientRect();
		if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onclose();
	}
</script>

<dialog bind:this={dialog} class="glass" oncancel={(e) => (e.preventDefault(), onclose())} onclick={outside}>
	<p class="hint">switch a tag on to make it a category</p>
	{#if tags.length}
		<ul>
			{#each tags as [tag, count] (tag)}
				{@const on = picked.has(tag)}
				<li>
					<span class="icon">{#if on}<BookBookmark size={18} strokeWidth={1.75} />{:else}<Tag size={18} strokeWidth={1.75} />{/if}</span>
					<span class="name">{tag} <small>{count}</small></span>
					<button class="switch" role="switch" aria-checked={on} aria-label="{tag} is a category" onclick={() => toggle(tag)}>
						<span class="track"
							><span class="knob">{#if on}<BookBookmark size={14} strokeWidth={2} />{:else}<Tag size={14} strokeWidth={2} />{/if}</span></span
						>
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">no tags yet. add them to posts and pages.</p>
	{/if}
	<div class="buttons">
		<button class="pill" aria-label="cancel" title="cancel" onclick={onclose}><Undo2 size={18} /></button>
		<button class="pill primary" aria-label="save" title="save" disabled={saving} onclick={save}>
			<Save size={18} class={saving ? 'pulse' : ''} />
		</button>
	</div>
</dialog>

<style>
	dialog {
		width: min(24rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 3rem);
		padding: 1.1rem;
		border-radius: 1.5rem;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	.hint,
	.empty {
		margin: 0 0 0.8rem;
		font-size: 0.85rem;
		color: var(--muted);
	}

	ul {
		display: grid;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.7rem;
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--bg) 60%, transparent);
	}

	.icon {
		display: flex;
		color: var(--muted);
	}

	.name {
		flex: 1;
		overflow-wrap: anywhere;
	}

	.name small {
		margin-left: 0.3rem;
		color: var(--muted);
	}

	.switch {
		display: flex;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.track {
		position: relative;
		width: 3.1rem;
		height: 1.8rem;
		border-radius: 999px;
		background: var(--glass);
		border: 1px solid var(--glass-edge);
		transition: background 0.2s ease;
	}

	.knob {
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 999px;
		color: var(--muted);
		background: var(--bg);
		box-shadow: 0 0 6px var(--shadow-soft);
		transition: transform 0.2s ease;
	}

	.switch[aria-checked='true'] .track {
		background: var(--accent);
	}

	.switch[aria-checked='true'] .knob {
		transform: translateX(1.3rem);
		color: var(--accent);
	}

	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 1rem;
	}

	.buttons .pill {
		min-width: 3.75rem;
		box-shadow: none;
	}
</style>
