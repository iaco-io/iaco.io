<script>
	// rain from the old site, looped. it's a plain <audio>, so it keeps playing in the background
	// and with the screen locked, and shows on the lock screen.
	// the file is src/media/rain.* (editable in the cms); if it's renamed away, the button hides
	import { onMount } from 'svelte';
	import RainCloud from './RainCloud.svelte';

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
		<!-- a little cloud; while it plays it rains, and thunders now and then -->
		<RainCloud raining={playing} size={19} />
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
		padding: 0 1.4rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--fg);
		cursor: pointer;
		transition: background 0.3s ease;
	}

	/* a soft pill behind it only while it's being pressed */
	.rain:active {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		transition: none;
	}

	.icons {
		display: flex;
		align-items: center;
		gap: 1px;
	}

	.notes {
		flex: none;
	}

	.notes {
		color: var(--soft);
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
		.playing .notes g {
			animation: none;
		}
	}
</style>
