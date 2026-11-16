<script>
	// forest rain made in the browser (no audio files): a soft rain bed with gusts,
	// patter on the leaves, heavier drips, and now and then a distant thunder
	import { onDestroy } from 'svelte';

	let playing = $state(false);
	/** @type {AudioContext | null} */
	let ctx = null;
	/** @type {GainNode | null} */
	let master = null;
	/** @type {{ white: AudioBuffer, brown: AudioBuffer } | null} */
	let buffers = null;
	/** @type {ReturnType<typeof setTimeout>[]} */
	let timers = [];

	const rand = (/** @type {number} */ a, /** @type {number} */ b) => a + Math.random() * (b - a);
	const later = (/** @type {() => void} */ fn, /** @type {number} */ ms) => timers.push(setTimeout(fn, ms));

	/** a few seconds of white noise (the hiss) and brown noise (the deep, soft part) */
	function makeBuffers(/** @type {AudioContext} */ c) {
		const make = (/** @type {boolean} */ brown) => {
			const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
			const data = buffer.getChannelData(0);
			let last = 0;
			for (let i = 0; i < data.length; i++) {
				const white = Math.random() * 2 - 1;
				last = (last + 0.02 * white) / 1.02;
				data[i] = brown ? last * 3.5 : white;
			}
			return buffer;
		};
		return { white: make(false), brown: make(true) };
	}

	function source(/** @type {AudioContext} */ c, /** @type {AudioBuffer} */ buffer, loop = true) {
		const s = c.createBufferSource();
		s.buffer = buffer;
		s.loop = loop;
		return s;
	}

	function filter(/** @type {AudioContext} */ c, /** @type {BiquadFilterType} */ type, frequency, Q = 0.7) {
		const f = c.createBiquadFilter();
		f.type = type;
		f.frequency.value = frequency;
		f.Q.value = Q;
		return f;
	}

	function gain(/** @type {AudioContext} */ c, value) {
		const g = c.createGain();
		g.gain.value = value;
		return g;
	}

	function pan(/** @type {AudioContext} */ c) {
		const p = c.createStereoPanner();
		p.pan.value = rand(-0.8, 0.8);
		return p;
	}

	/** connects nodes in a row and the last one to `out` */
	function chain(/** @type {AudioNode} */ out, /** @type {AudioNode[]} */ ...nodes) {
		nodes.reduce((a, b) => (a.connect(b), b)).connect(out);
	}

	/** tiny drops on the leaves, many per second */
	function patter() {
		if (!ctx || !master || !buffers) return;
		const t = ctx.currentTime;
		const s = source(ctx, buffers.white, false);
		const env = gain(ctx, 0);
		chain(master, s, filter(ctx, 'bandpass', rand(2500, 6500), 3), env, pan(ctx));
		env.gain.linearRampToValueAtTime(rand(0.015, 0.045), t + 0.004);
		env.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.03, 0.08));
		s.start(t, rand(0, 3));
		s.stop(t + 0.12);
		later(patter, rand(15, 90));
	}

	/** a heavier drip falling from a leaf: a short "plink" */
	function drip() {
		if (!ctx || !master) return;
		const t = ctx.currentTime;
		const o = ctx.createOscillator();
		const env = gain(ctx, 0);
		const f = rand(650, 1500);
		o.frequency.setValueAtTime(f, t);
		o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.12);
		chain(master, o, env, pan(ctx));
		env.gain.linearRampToValueAtTime(rand(0.04, 0.09), t + 0.003);
		env.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.09, 0.18));
		o.start(t);
		o.stop(t + 0.25);
		later(drip, rand(350, 2400));
	}

	/** a distant thunder: a slow, deep rumble that rolls in and fades */
	function thunder() {
		if (!ctx || !master || !buffers) return;
		const t = ctx.currentTime;
		const s = source(ctx, buffers.brown);
		const env = gain(ctx, 0);
		const peak = rand(0.5, 0.95);
		chain(master, s, filter(ctx, 'lowpass', rand(110, 190)), env);
		env.gain.linearRampToValueAtTime(peak * 0.4, t + rand(0.3, 0.8));
		env.gain.linearRampToValueAtTime(peak, t + rand(1, 1.8));
		env.gain.linearRampToValueAtTime(peak * 0.6, t + rand(2.4, 3.2));
		env.gain.linearRampToValueAtTime(peak * 0.75, t + rand(3.5, 4.2));
		env.gain.exponentialRampToValueAtTime(0.0001, t + rand(8, 11));
		s.start(t, rand(0, 3));
		s.stop(t + 12);
		later(thunder, rand(25_000, 60_000));
	}

	function start() {
		ctx = new AudioContext();
		buffers = makeBuffers(ctx);
		master = gain(ctx, 0);
		master.connect(ctx.destination);

		// the rain bed, softly breathing like gusts of wind
		const bed = gain(ctx, 1);
		bed.connect(master);
		const hiss = source(ctx, buffers.white);
		const body = source(ctx, buffers.brown);
		const gust = ctx.createOscillator();
		gust.frequency.value = 0.11;
		chain(bed, hiss, filter(ctx, 'highpass', 250), filter(ctx, 'lowpass', 3500), gain(ctx, 0.16));
		chain(bed, body, filter(ctx, 'lowpass', 450), gain(ctx, 0.35));
		chain(bed.gain, gust, gain(ctx, 0.2));
		for (const node of [hiss, body, gust]) node.start();

		master.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 2.5);
		playing = true;
		patter();
		drip();
		later(thunder, rand(8_000, 15_000));
	}

	function stop() {
		playing = false;
		timers.forEach(clearTimeout);
		timers = [];
		const c = ctx;
		if (!c || !master) return;
		master.gain.cancelScheduledValues(c.currentTime);
		master.gain.setValueAtTime(master.gain.value, c.currentTime);
		master.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
		setTimeout(() => c.close(), 1300);
		ctx = master = buffers = null;
	}

	onDestroy(() => playing && stop());
</script>

<button class="rain" class:playing onclick={() => (playing ? stop() : start())} aria-pressed={playing}>
	<span class="icons">
		<!-- waves that flow while it plays -->
		<svg class="wave" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
			<defs><clipPath id="rain-clip"><rect x="1" y="0" width="22" height="24" /></clipPath></defs>
			<g clip-path="url(#rain-clip)">
				<path class="w1" d="M-24 7 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0" />
				<path class="w2" d="M-24 12 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0" />
				<path class="w3" d="M-24 17 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0 q3 -2.4 6 0 t6 0" />
			</g>
		</svg>
		<!-- two notes that take turns to rise -->
		<svg class="notes" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<g class="n1"><circle cx="6" cy="18" r="2.5" /><path d="M8.5 18V6l5 2" /></g>
			<g class="n2"><circle cx="16" cy="15" r="2.5" /><path d="M18.5 15V3l4 1.6" /></g>
		</svg>
	</span>
	<em>raiɳ</em>
</button>

<style>
	.rain {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		height: 2.4rem;
		padding: 0 1rem 0 0.9rem;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--fg);
		cursor: pointer;
	}

	.icons {
		display: flex;
		align-items: center;
		gap: 1px;
	}

	em {
		font-family: 'Iowan Old Style', 'Palatino', Georgia, 'Times New Roman', serif;
		font-size: 0.95rem;
		font-style: italic;
		letter-spacing: 0.02em;
	}

	.wave,
	.notes {
		flex: none;
	}

	.notes {
		color: var(--soft);
	}

	/* each wave line slides by one wave length, at its own pace, so the water flows */
	.playing .wave path {
		animation: flow 2.4s linear infinite;
	}

	.playing .wave .w2 {
		animation-duration: 3.2s;
		animation-direction: reverse;
	}

	.playing .wave .w3 {
		animation-duration: 2s;
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
		.playing .notes g {
			animation: none;
		}
	}
</style>
