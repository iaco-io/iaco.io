<script>
	// gentle rain made in the browser (no audio files): soft noise plus scattered drops
	import { Waves, Music } from '@lucide/svelte';
	import { onDestroy } from 'svelte';

	let playing = $state(false);
	/** @type {AudioContext | null} */
	let ctx = null;
	/** @type {GainNode | null} */
	let master = null;
	/** @type {ReturnType<typeof setTimeout>} */
	let dropTimer;

	/** a looping noise source; brown noise is deep and soft, white is the hiss of rain */
	function noise(/** @type {AudioContext} */ c, /** @type {'white' | 'brown'} */ kind) {
		const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
		const data = buffer.getChannelData(0);
		let last = 0;
		for (let i = 0; i < data.length; i++) {
			const white = Math.random() * 2 - 1;
			last = (last + 0.02 * white) / 1.02;
			data[i] = kind === 'white' ? white : last * 3.5;
		}
		const source = c.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		return source;
	}

	/** @param {AudioContext} c @param {AudioNode} out */
	function chain(c, out, /** @type {AudioNode[]} */ ...nodes) {
		nodes.reduce((a, b) => (a.connect(b), b)).connect(out);
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

	/** a single soft drop: a tiny burst of filtered noise */
	function drop() {
		if (!ctx || !master) return;
		const t = ctx.currentTime;
		const src = noise(ctx, 'white');
		const env = gain(ctx, 0);
		chain(ctx, master, src, filter(ctx, 'bandpass', 1800 + Math.random() * 3000, 4), env);
		env.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.08, t + 0.005);
		env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.08);
		src.start(t);
		src.stop(t + 0.2);
		dropTimer = setTimeout(drop, 20 + Math.random() * 120);
	}

	function start() {
		ctx = new AudioContext();
		master = gain(ctx, 0);
		master.connect(ctx.destination);
		const hiss = noise(ctx, 'white');
		const body = noise(ctx, 'brown');
		chain(ctx, master, hiss, filter(ctx, 'highpass', 500), filter(ctx, 'lowpass', 6000), gain(ctx, 0.12));
		chain(ctx, master, body, filter(ctx, 'lowpass', 700), gain(ctx, 0.5));
		hiss.start();
		body.start();
		master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);
		drop();
		playing = true;
	}

	function stop() {
		playing = false;
		clearTimeout(dropTimer);
		const c = ctx;
		if (!c || !master) return;
		master.gain.cancelScheduledValues(c.currentTime);
		master.gain.setValueAtTime(master.gain.value, c.currentTime);
		master.gain.linearRampToValueAtTime(0, c.currentTime + 1);
		setTimeout(() => c.close(), 1100);
		ctx = master = null;
	}

	onDestroy(() => playing && stop());
</script>

<button class="rain glass" class:playing onclick={() => (playing ? stop() : start())} aria-pressed={playing}>
	<span class="wave"><Waves size={16} /></span>
	<span class="notes"><Music size={13} /></span>
	<em>raiɳ</em>
</button>

<style>
	.rain {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		height: 2.4rem;
		padding: 0 1rem 0 0.9rem;
		border-radius: 999px;
		color: var(--fg);
		cursor: pointer;
		border: 0;
	}

	em {
		font-family: 'Iowan Old Style', 'Palatino', Georgia, 'Times New Roman', serif;
		font-size: 0.95rem;
		font-style: italic;
		letter-spacing: 0.02em;
	}

	.wave,
	.notes {
		display: flex;
	}

	.notes {
		color: var(--soft);
	}

	.playing .wave {
		animation: drift 2.4s ease-in-out infinite;
	}

	.playing .notes {
		animation: bob 1.2s ease-in-out infinite;
	}

	@keyframes drift {
		50% {
			transform: translateX(3px);
		}
	}

	@keyframes bob {
		0%,
		100% {
			transform: translateY(0) rotate(0);
		}
		50% {
			transform: translateY(-3px) rotate(-8deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.playing .wave,
		.playing .notes {
			animation: none;
		}
	}
</style>
