<script>
	// the order of the links in the blog's menu: move a link up or down, then save. links not saved in an order
	// yet (a new page or category) come after the others, in their usual order
	import { ChevronUp, ChevronDown, Save, Undo2 } from '@lucide/svelte';

	/**
	 * @type {{
	 *   links: { href: string, label: string }[],
	 *   onsave: (order: string[]) => Promise<void>,
	 *   onclose: () => void
	 * }}
	 */
	let { links, onsave, onclose } = $props();

	// a copy to arrange; nothing changes until saved
	let list = $state(links.map((l) => ({ ...l })));
	let saving = $state(false);

	function move(/** @type {number} */ i, /** @type {number} */ step) {
		const j = i + step;
		if (j < 0 || j >= list.length) return;
		[list[i], list[j]] = [list[j], list[i]];
	}

	async function save() {
		saving = true;
		try {
			await onsave(list.map((l) => l.href));
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

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog class="dialog glass" bind:this={dialog} onclick={outside} oncancel={(e) => (e.preventDefault(), onclose())} aria-label="menu order">
	<p class="hint">the order of the links in the blog's menu</p>
	<ol>
		{#each list as link, i (link.href)}
			<li>
				<span class="label">{link.label}</span>
				<button class="pill square" aria-label="move {link.label} up" disabled={i === 0} onclick={() => move(i, -1)}><ChevronUp size={18} /></button>
				<button class="pill square" aria-label="move {link.label} down" disabled={i === list.length - 1} onclick={() => move(i, 1)}><ChevronDown size={18} /></button>
			</li>
		{/each}
	</ol>
	<div class="buttons">
		<button class="pill" aria-label="cancel" onclick={onclose}><Undo2 size={18} /></button>
		<button class="pill primary" aria-label="save" disabled={saving} onclick={save}><Save size={18} class={saving ? 'pulse' : ''} /></button>
	</div>
</dialog>

<style>
	.dialog {
		width: min(24rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 3rem);
		padding: 1.1rem;
		border-radius: 1.5rem;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
	}

	.dialog[open] {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	.hint {
		margin: 0;
		font-size: 0.9rem;
		color: var(--muted);
	}

	ol {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-height: 0;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.4rem 0.35rem 0.9rem;
		border-radius: 1rem;
		background: var(--glass);
	}

	.label {
		flex: 1;
		overflow-wrap: anywhere;
	}

	li .pill {
		box-shadow: none;
	}

	.buttons {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}
</style>
