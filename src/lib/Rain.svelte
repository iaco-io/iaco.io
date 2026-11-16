<script>
	// rain from the old site, looped. it's a plain <audio>, so it keeps playing in the background
	// and with the screen locked, and shows on the lock screen.
	// the file is src/media/rain.* (editable in the cms); if it's renamed away, the button hides
	import { onMount } from 'svelte';

	const src = Object.values(
		import.meta.glob('/src/media/rain.{mp3,m4a,aac,ogg,wav}', { query: '?url', import: 'default', eager: true })
	)[0];

	let playing = $state(false);
	/** @type {HTMLAudioElement} */
	let audio;

	onMount(() => {
		if (!src) return;
		audio = new Audio(/** @type {string} */ (src));
		audio.loop = true;
		audio.preload = 'none';
		audio.onplay = () => (playing = true);
		audio.onpause = () => (playing = false);
		if ('mediaSession' in navigator) {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: 'rain',
				artist: 'iaco.io',
				artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
			});
			navigator.mediaSession.setActionHandler('play', () => audio.play());
			navigator.mediaSession.setActionHandler('pause', () => audio.pause());
		}
		return () => audio?.pause();
	});

	const toggle = () => (audio?.paused ? audio.play() : audio?.pause());
</script>

{#if src}
<button class="rain" class:playing onclick={toggle} aria-pressed={playing} aria-label="rain">
	<span class="icons">
		<!-- three waves; while it plays, the top one turns into falling rain and the others flow -->
		<svg class="wave" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
			<defs><clipPath id="rain-clip"><rect x="1" y="0" width="22" height="24" /></clipPath></defs>
			<g class="drops">
				<path class="d1" d="M6 3v3" />
				<path class="d2" d="M12 5v3" />
				<path class="d3" d="M18 3v3" />
			</g>
			<g clip-path="url(#rain-clip)">
				<path class="w0" d="M-24 6 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0" />
				<path class="w1" d="M-24 12 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0" />
				<path class="w2" d="M-24 18 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0" />
			</g>
		</svg>
		<!-- two notes that take turns to rise -->
		<svg class="notes" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<g class="n1"><circle cx="6" cy="18" r="2.5" /><path d="M8.5 18V6l5 2" /></g>
			<g class="n2"><circle cx="16" cy="15" r="2.5" /><path d="M18.5 15V3l4 1.6" /></g>
		</svg>
	</span>
</button>
{/if}

<style>
	.rain {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		height: 2.4rem;
		padding: 0 0.9rem;
		border: 0;
		border-radius: 0.9rem;
		background: transparent;
		color: var(--fg);
		cursor: pointer;
		transition: background 0.3s ease;
	}

	/* a soft tile behind it only while it's being pressed */
	.rain:active {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		transition: none;
	}

	.icons {
		display: flex;
		align-items: center;
		gap: 1px;
	}

	.wave,
	.notes {
		flex: none;
	}

	.notes {
		color: var(--soft);
	}

	/* each wave line slides by one wave length, at its own pace, so the water flows */
	.playing .wave .w1,
	.playing .wave .w2 {
		animation: flow 2.4s linear infinite;
	}

	.playing .wave .w2 {
		animation-duration: 3.2s;
		animation-direction: reverse;
	}

	/* the top wave gives way to the rain */
	.wave .w0,
	.drops {
		transition: opacity 0.4s ease;
	}

	.drops,
	.playing .wave .w0 {
		opacity: 0;
	}

	.playing .drops {
		opacity: 1;
	}

	/* drops fall and fade, one after another */
	.playing .drops path {
		animation: fall 1.1s ease-in infinite;
	}

	.playing .drops .d2 {
		animation-delay: -0.4s;
	}

	.playing .drops .d3 {
		animation-delay: -0.75s;
	}

	@keyframes fall {
		0% {
			transform: translateY(-2px);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translateY(5px);
			opacity: 0;
		}
	}

	@keyframes flow {
		to {
			transform: translateX(12px);
		}
	}

	/* the notes rise in turn */
	.notes g {
		transform-box: fill-box;
	}

	.playing .notes .n1 {
		animation: rise 1.4s ease-in-out infinite;
	}

	.playing .notes .n2 {
		animation: rise 1.4s ease-in-out -0.7s infinite;
	}

	@keyframes rise {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.playing .wave path,
		.playing .drops path,
		.playing .notes g {
			animation: none;
		}
	}
</style>
