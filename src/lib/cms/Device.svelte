<script>
	// an iframe drawn at a real screen size, scaled down to fit its column
	/** @type {{ label: string, width: number, height: number, frame?: HTMLIFrameElement }} */
	let { label, width, height, frame = $bindable() } = $props();

	let box = $state(0);
</script>

<figure>
	<div class="screen glass" bind:clientWidth={box} style:aspect-ratio="{width} / {height}">
		<iframe
			bind:this={frame}
			src="/preview/"
			title="{label} preview"
			width={width}
			height={height}
			style:transform="scale({box / width})"
		></iframe>
	</div>
	<figcaption>{label}</figcaption>
</figure>

<style>
	figure {
		margin: 0;
	}

	.screen {
		position: relative;
		overflow: hidden;
		border-radius: 1.25rem;
		box-shadow: 0 10px 40px var(--shadow);
	}

	iframe {
		position: absolute;
		top: 0;
		left: 0;
		border: 0;
		transform-origin: 0 0;
	}

	figcaption {
		margin-top: 0.5rem;
		text-align: center;
		font-size: 0.8rem;
		color: var(--muted);
	}
</style>
