<script>
	// picks a media file from a grid of square thumbnails, as many columns as fit (icons for sound, video, files)
	import Thumb from './Thumb.svelte';
	import { ImageOff, Undo2, Music, Film, File as FileIcon } from '@lucide/svelte';

	/**
	 * @type {{
	 *   images: string[],
	 *   resolve: (name: string) => string,
	 *   current: string,
	 *   label?: string,
	 *   none?: boolean,
	 *   ondone: (name: string | null) => void
	 * }}
	 */
	let { images, resolve, current, label = 'main image', none = true, ondone } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();
	$effect(() => dialog?.showModal());

	/** a tap on the dimmed area around the popup closes it, changing nothing */
	function outside(/** @type {MouseEvent} */ e) {
		if (e.target !== dialog || !dialog) return;
		const r = dialog.getBoundingClientRect();
		if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ondone(null);
	}
</script>

<dialog bind:this={dialog} class="glass" oncancel={(e) => (e.preventDefault(), ondone(null))} onclick={outside}>
	<div class="head">
		<span class="label">{label}</span>
		<button class="pill" aria-label="cancel" title="cancel" onclick={() => ondone(null)}><Undo2 size={18} /></button>
	</div>
	<div class="grid">
		{#if none}
			<button class="tile none" class:active={!current} title="none" onclick={() => ondone('')}>
				<ImageOff size={22} />
			</button>
		{/if}
		{#each images as name (name)}
			<button class="tile" class:active={current === name} title={name} onclick={() => ondone(name)}>
				{#if /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(name)}
					<Thumb src={resolve(name)} {name} />
				{:else}
					{#if /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(name)}<Music size={22} />{:else if /\.(mp4|mov|webm|m4v)$/i.test(name)}<Film size={22} />{:else}<FileIcon size={22} />{/if}
					<small>{name.replace(/^.*\//, '')}</small>
				{/if}
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

	.tile small {
		max-width: 90%;
		overflow: hidden;
		font-size: 0.7rem;
		text-overflow: ellipsis;
		white-space: nowrap;
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
