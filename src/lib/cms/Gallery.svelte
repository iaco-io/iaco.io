<script>
	// picks the main image from a grid of square thumbnails, as many columns as fit
	import { ImageOff, Undo2 } from '@lucide/svelte';

	/**
	 * @type {{
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   current: string,
	 *   ondone: (name: string | null) => void
	 * }}
	 */
	let { images, resolve, current, ondone } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	$effect(() => dialog?.showModal());
</script>

<dialog bind:this={dialog} class="glass" oncancel={(e) => (e.preventDefault(), ondone(null))}>
	<div class="head">
		<span class="label">main image</span>
		<button class="pill" aria-label="cancel" title="cancel" onclick={() => ondone(null)}><Undo2 size={18} /></button>
	</div>
	<div class="grid">
		<button class="tile none" class:active={!current} title="no main image" onclick={() => ondone('')}>
			<ImageOff size={22} />
		</button>
		{#each images as name (name)}
			<button class="tile" class:active={current === name} title={name} onclick={() => ondone(name)}>
				<img src={resolve(name)} alt={name} loading="lazy" />
			</button>
		{/each}
	</div>
</dialog>

<style>
	dialog {
		width: min(40rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 4rem);
		padding: 1rem;
		border-radius: 1.5rem;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 85%, transparent);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.3);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.head .pill {
		box-shadow: none;
	}

	.label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
		gap: 0.35rem;
	}

	.tile {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: 0.6rem;
		color: var(--muted);
		background: var(--panel);
		cursor: pointer;
	}

	.tile img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.tile {
		position: relative;
	}

	.tile.active::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 3px solid var(--accent);
		border-radius: inherit;
	}
</style>
