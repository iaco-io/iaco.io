<script>
	// edits iaco's alphabet (<al>): which letter becomes which, each on or off. a sample on top shows the result
	import { Save, Undo2 } from '@lucide/svelte';

	/**
	 * @typedef {Record<string, { to: string, on: boolean }>} Alphabet
	 * @type {{ setup: Alphabet, onsave: (setup: Alphabet) => Promise<void>, onclose: () => void }}
	 */
	let { setup, onsave, onclose } = $props();

	const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
	const SAMPLE = 'abcdefghiyjklmnopqrstuwvxz';

	// a copy to edit; nothing changes until saved
	let draft = $state(
		Object.fromEntries(LETTERS.map((c) => [c, { to: setup[c]?.to || c, on: !!setup[c]?.on }]))
	);
	const sample = $derived([...SAMPLE].map((c) => (draft[c].on && draft[c].to ? draft[c].to : c)).join(''));
	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			await onsave(JSON.parse(JSON.stringify(draft)));
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
	<p class="sample">{sample}</p>
	<div class="grid">
		{#each LETTERS as c (c)}
			<div class="cell" class:off={!draft[c].on}>
				<label>
					<span>{c}</span>
					<input bind:value={draft[c].to} maxlength="2" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="{c} becomes" />
				</label>
				<button
					class="switch"
					role="switch"
					aria-checked={draft[c].on}
					aria-label="replace {c}"
					onclick={() => (draft[c].on = !draft[c].on)}
				>
					<span class="track"><span class="knob"></span></span>
				</button>
			</div>
		{/each}
	</div>
	<div class="buttons">
		<button class="pill" aria-label="cancel" title="cancel" onclick={onclose}><Undo2 size={18} /></button>
		<button class="pill primary" aria-label="save" title="save" disabled={saving} onclick={save}>
			<Save size={18} class={saving ? 'pulse' : ''} />
		</button>
	</div>
</dialog>

<style>
	dialog {
		width: min(30rem, calc(100vw - 2rem));
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

	.sample {
		margin: 0 0 1rem;
		padding: 0.7rem 0.9rem;
		border-radius: 0.9rem;
		font-size: 1.25rem;
		letter-spacing: 0.04em;
		text-align: center;
		overflow-wrap: anywhere;
		background: var(--panel);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.9rem, 1fr));
		gap: 0.5rem;
	}

	.cell {
		display: grid;
		justify-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.2rem;
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--bg) 60%, transparent);
		transition: opacity 0.2s ease;
	}

	.cell.off label {
		opacity: 0.45;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 1.1rem;
	}

	label input {
		width: 2.1rem;
		padding: 0.25rem 0;
		text-align: center;
		font-size: 1.1rem;
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
		width: 2.4rem;
		height: 1.4rem;
		border-radius: 999px;
		background: var(--glass);
		border: 1px solid var(--glass-edge);
		transition: background 0.2s ease;
	}

	.knob {
		position: absolute;
		top: 0.12rem;
		left: 0.12rem;
		width: 1.05rem;
		height: 1.05rem;
		border-radius: 999px;
		background: var(--bg);
		box-shadow: 0 0 6px var(--shadow-soft);
		transition: transform 0.2s ease;
	}

	.switch[aria-checked='true'] .track {
		background: var(--accent);
	}

	.switch[aria-checked='true'] .knob {
		transform: translateX(1rem);
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
