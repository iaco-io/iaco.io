<script>
	// a media file's picture. a one-colour svg (an icon drawn with "currentColor") is shown small, in the text colour,
	// so it reads in light and dark; anything else fills the square
	/** @type {{ src: string, name: string, size?: string }} */
	let { src, name, size = '40%' } = $props();

	/** @type {Record<string, Promise<boolean>>} */
	const known = (globalThis.__iconCheck ??= {});
	const svg = $derived(/\.svg$/i.test(name));
	let icon = $state(false);
	$effect(() => {
		if (!svg) return void (icon = false);
		known[src] ??= fetch(src)
			.then((r) => r.text())
			.then((t) => /currentColor/.test(t))
			.catch(() => false);
		known[src].then((v) => (icon = v));
	});
</script>

{#if icon}
	<span class="icon" style:width={size} style:--src={`url(${JSON.stringify(src)})`} role="img" aria-label={name}></span>
{:else}
	<img {src} alt="" loading="lazy" />
{/if}

<style>
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.icon {
		width: 40%;
		aspect-ratio: 1;
		background: var(--fg);
		-webkit-mask: var(--src) center / contain no-repeat;
		mask: var(--src) center / contain no-repeat;
	}
</style>
