<script>
	// the date and time of day, with a little animation beside them: on the blog a raining cloud, in the cms an old
	// grandfather clock. both move in steps of 0.864 s (a hundred-thousandth of a day), in step with the time of day.
	// next to it: the date as year and day of the year (2026-32•0), and the time as how much of the day has passed (45.67%)
	import { onMount } from 'svelte';

	/**
	 * inline: sits where it's placed (e.g. in the cms menu) instead of the page's top right
	 * icon: 'clock' (grandfather clock) or 'cloud' (raining cloud)
	 */
	let { inline = false, icon = 'clock' } = $props();

	let now = $state(/** @type {Date | null} */ (null));
	onMount(() => {
		now = new Date();
		const timer = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(timer);
	});

	const DAY = 86_400_000;
	const sinceMidnight = $derived(
		now ? now.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() : 0
	);
	const ordinal = $derived(
		now
			? Math.round(
					(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / DAY
				) + 1
			: 0
	);
	// the day of the year as DD•D, with a very small dot
	const day = $derived(String(ordinal).padStart(3, '0'));
	// read from the animation clock when it runs, so the % changes at the same moment as the thunder
	const percent = $derived((Math.floor(((now_ms || sinceMidnight) / DAY) * 10_000) / 100).toFixed(2).split('.'));
	// the hands show the usual time, the pendulum keeps in step with the day
	const hours = $derived(now ? ((now.getHours() % 12) + now.getMinutes() / 60) * 30 : 0);
	const minutes = $derived(now ? now.getMinutes() * 6 : 0);
	// a real pendulum: the angle follows a cosine of the time, so it slows at the ends and is fastest in the middle.
	// one full swing there and back is 1.728 s, kept in step with the time of day
	let swing = $state(0);
	// the cloud rains like real rain: drops fall at a steady speed (rain soon stops speeding up), quickly, in five
	// lanes under the cloud. each lane drips at a steady beat with a little jitter, and the lanes are out of step,
	// so it looks random without bunching up or leaving gaps. it's worked out from the time, so every screen shows
	// the same rain. every 8.64 s (0.01% of a day) it also thunders, over the rain
	let now_ms = $state(0);
	const LANES = [9.6, 11.8, 14, 16.2, 18.4];
	const BEAT = 432; // ms between drops in a lane
	const FALL = 380; // ms a drop takes to fall
	const random = (/** @type {number} */ n) => {
		const x = Math.sin(n * 12.9898) * 43758.5453;
		return x - Math.floor(x);
	};
	const cycle = $derived(now_ms % 8640);
	// the thunder starts the moment the last digit of the % changes
	const thunder = $derived(cycle < 864 ? cycle / 864 : -1);
	const drops = $derived.by(() => {
		const list = [];
		LANES.forEach((x, lane) => {
			const offset = random(lane + 1) * BEAT;
			const n0 = Math.floor((now_ms - offset) / BEAT);
			for (const n of [n0 - 1, n0]) {
				const id = n * 8 + lane;
				const start = n * BEAT + offset + (random(id) - 0.5) * 120;
				const p = (now_ms - start) / FALL;
				if (p >= 0 && p < 1) list.push({ id, x: x + (random(id + 0.5) - 0.5) * 0.8, p });
			}
		});
		return list;
	});
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let frame = 0;
		const tick = () => {
			const t = Date.now() - new Date().setHours(0, 0, 0, 0);
			swing = 9 * Math.cos((2 * Math.PI * (t % 1728)) / 1728);
			now_ms = t;
			frame = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(frame);
	});
</script>

{#if now}
	<div class="dayclock" class:inline title="day {ordinal} of {now.getFullYear()}, {percent.join('.')}% of the day">
		<span class="date">{now.getFullYear()}-{day.slice(0, 2)}<span class="dot">•</span>{day[2]}</span>
		<span class="time">{percent[0]}<small>.{percent[1]}%</small></span>
		{#if icon === 'cloud'}
			<!-- a small cloud raining at random, with a thunder every 8.64 s -->
			<svg viewBox="0 0 28 26" width="27" height="25" aria-hidden="true">
				<path class:flash={thunder >= 0 && thunder < 0.5} d="M8.5 16.5h11.5a4.2 4.2 0 0 0 .4-8.4 6 6 0 0 0-11.6-1.2 4.8 4.8 0 0 0-.3 9.6Z" />
				{#if thunder >= 0}
					<path class="bolt" style:opacity={thunder < 0.12 || (thunder > 0.2 && thunder < 0.32) ? 1 : Math.max(0, 1 - (thunder - 0.32) * 2.2)} d="M15 17.3l-2 3.1h2.4l-1.6 3.2" />
				{/if}
				<!-- little lines of rain falling steadily from under the cloud, fading in and out -->
				{#each drops as { id, x, p } (id)}
					<path
						class="drop"
						style:opacity={p < 0.12 ? p / 0.12 : p > 0.75 ? (1 - p) / 0.25 : 1}
						style:transform="translate({x}px, {17.2 + p * 6.8}px)"
						d="M0 0v1.6"
					/>
				{/each}
			</svg>
		{:else}
			<!-- an old grandfather clock: a hood with a swan-neck pediment and finials, the face, a narrow case
			     with the pendulum, and a base -->
			<svg viewBox="0 0 20 36" width="17" height="31" aria-hidden="true">
				<circle cx="10" cy="1.3" r=".65" />
				<path d="M10 2v1.2" />
				<circle cx="4.3" cy="5.4" r=".55" />
				<circle cx="15.7" cy="5.4" r=".55" />
				<path d="M4.6 7.2C5.4 5.3 7.2 4.7 8.4 3.8c.4-.3.9-.1.8.4" />
				<path d="M15.4 7.2c-.8-1.9-2.6-2.5-3.8-3.4-.4-.3-.9-.1-.8.4" />
				<path d="M4.3 7.2h11.4M4.8 7.2V14h10.4V7.2" />
				<path d="M5.7 7.2V14M14.3 7.2V14" />
				<circle cx="10" cy="10.6" r="2.7" />
				<path class="hand" d="M10 10.6V9.2" style:transform="rotate({hours}deg)" />
				<path class="hand" d="M10 10.6V8.5" style:transform="rotate({minutes}deg)" />
				<path d="M6.1 14v16.2h7.8V14" />
				<g class="pendulum" style:transform="rotate({swing}deg)">
					<path d="M10 14.3v10.2" />
					<circle cx="10" cy="25.7" r="1.2" />
				</g>
				<path d="M5 30.2h10v2.2H5Z" />
				<path d="M5.9 32.4v1.4M14.1 32.4v1.4" />
			</svg>
		{/if}
	</div>
{/if}

<style>
	.dayclock {
		position: absolute;
		top: calc(var(--top) + var(--gap));
		right: var(--gap);
		z-index: 5;
		height: 3rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
	}

	.date {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.dot {
		margin: 0 0.04em;
		font-size: 0.4em;
		vertical-align: middle;
	}

	.time {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.time small {
		font-size: 0.7em;
		font-weight: 500;
		color: var(--muted);
	}

	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 0.9;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.flash {
		fill: color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.drop {
		stroke-width: 0.9;
	}

	.bolt {
		stroke-width: 1.1;
	}

	.hand {
		transform-box: view-box;
		transform-origin: 10px 10.6px;
	}

	.pendulum {
		transform-box: view-box;
		transform-origin: 10px 14.3px;
	}

	.inline {
		position: static;
	}

	/* on big screens the menu button sits at the top right */
	@media (min-width: 768px) {
		.dayclock:not(.inline) {
			right: calc(var(--gap) + 7.5rem);
		}
	}
</style>
