<script>
	// a little cloud that rains while `raining` is on, and thunders every 8.64 s (0.01% of a day, when the clock's %
	// changes). the rain falls at a steady speed (rain soon stops speeding up): five drippers each drip at their own
	// slightly different pace, with a loose jitter and an occasional skip, and every drop falls from a random spot
	// under the cloud, so it never bunches up and never settles into a pattern. it's worked out from the time, so
	// every screen shows the same rain. no new drops start while it thunders

	/** @type {{ raining?: boolean, size?: number }} */
	let { raining = true, size = 22 } = $props();

	let now_ms = $state(0);
	const BEATS = [470, 530, 610, 500, 570]; // ms between drops, one pace per dripper
	const FALL = 640; // ms a drop takes to fall
	const random = (/** @type {number} */ n) => {
		const x = Math.sin(n * 12.9898) * 43758.5453;
		return x - Math.floor(x);
	};
	const thunder = $derived(raining && now_ms % 8640 < 864 ? (now_ms % 8640) / 864 : -1);
	const drops = $derived.by(() => {
		if (!raining) return [];
		const list = [];
		BEATS.forEach((beat, lane) => {
			const offset = random(lane + 1) * beat;
			const n0 = Math.floor((now_ms - offset) / beat);
			for (const n of [n0 - 2, n0 - 1, n0]) {
				const id = n * 8 + lane;
				if (random(id + 0.3) < 0.2) continue; // now and then a dripper skips a drop
				const start = n * beat + offset + (random(id) - 0.5) * beat * 0.7;
				if (((start % 8640) + 8640) % 8640 < 864) continue;
				const p = (now_ms - start) / FALL;
				if (p >= 0 && p < 1) list.push({ id, x: 9.2 + random(id + 0.5) * 9.6, p });
			}
		});
		return list;
	});

	// only animates while it rains
	$effect(() => {
		if (!raining || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let frame = 0;
		const tick = () => {
			now_ms = Date.now() - new Date().setHours(0, 0, 0, 0);
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(frame);
	});
</script>

<!-- the box fits the cloud only, so it sits in the middle; the rain falls below it -->
<svg viewBox="3 2.2 22.2 15" width={size} height={size * (15 / 22.2)} aria-hidden="true">
	<path class:flash={thunder >= 0 && thunder < 0.5} d="M8.5 16.5h11.5a4.2 4.2 0 0 0 .4-8.4 6 6 0 0 0-11.6-1.2 4.8 4.8 0 0 0-.3 9.6Z" />
	{#if thunder >= 0}
		<path
			class="bolt"
			style:opacity={thunder < 0.12 || (thunder > 0.2 && thunder < 0.32) ? 1 : Math.max(0, 1 - (thunder - 0.32) * 2.2)}
			d="M15 17.3l-2 3.1h2.4l-1.6 3.2"
		/>
	{/if}
	{#each drops as { id, x, p } (id)}
		<path
			class="drop"
			style:opacity={p < 0.12 ? p / 0.12 : p > 0.75 ? (1 - p) / 0.25 : 1}
			style:transform="translate({x}px, {17.2 + p * 6.8}px)"
			d="M0 0v1.6"
		/>
	{/each}
</svg>

<style>
	svg {
		flex: none;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.flash {
		fill: color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.drop {
		stroke-width: 1.1;
	}

	.bolt {
		stroke-width: 1.2;
	}
</style>
