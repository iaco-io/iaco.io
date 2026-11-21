<script>
	// the date and time of day, with a little animation beside them: on the blog a tiny grid of dots, in the cms an old
	// grandfather clock. both move in steps of 0.864 s (a hundred-thousandth of a day), in step with the time of day.
	// next to it: the date as year and day of the year (2026-32•0), and the time as how much of the day has passed (45.67%)
	import { onMount } from 'svelte';

	/**
	 * inline: sits where it's placed (e.g. in the cms menu) instead of the page's top right
	 * icon: 'clock' (grandfather clock) or 'grid' (counting dots)
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
	// read from the animation clock when it runs, so the % changes at the same moment as the dots gather
	const percent = $derived((Math.floor(((now_ms || sinceMidnight) / DAY) * 10_000) / 100).toFixed(2).split('.'));
	// the hands show the usual time, the pendulum keeps in step with the day
	const hours = $derived(now ? ((now.getHours() % 12) + now.getMinutes() / 60) * 30 : 0);
	const minutes = $derived(now ? now.getMinutes() * 6 : 0);
	// a real pendulum: the angle follows a cosine of the time, so it slows at the ends and is fastest in the middle.
	// one full swing there and back is 1.728 s, kept in step with the time of day
	let swing = $state(0);
	let now_ms = $state(0);

	// the dots: a tiny 3×3 grid that counts the ten 0.864 s ticks of each 8.64 s (0.01% of a day).
	// tick 1: one dot top left. ticks 2–9: a copy of the newest dot slides to the next spot (top middle, top right,
	// middle right, centre, middle left, bottom left, bottom middle, bottom right) while the others stay.
	// tick 10, when the % changes: all dots gather in the centre, then that one dot moves back to the top left
	const SPOTS = [[2, 2], [6, 2], [10, 2], [10, 6], [6, 6], [2, 6], [2, 10], [6, 10], [10, 10]];
	const ease = (/** @type {number} */ x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
	const mix = (/** @type {number[]} */ a, /** @type {number[]} */ b, /** @type {number} */ t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
	const dots = $derived.by(() => {
		const cycle = now_ms % 8640;
		const tick = Math.floor(cycle / 864); // 0 is the 10th tick, right when the % changes
		const f = (cycle % 864) / 864;
		const move = ease(Math.min(1, f / 0.45)); // each move takes the first part of its tick
		if (tick === 0) {
			if (f < 0.5) return SPOTS.map((s) => mix(s, SPOTS[4], ease(f / 0.5)));
			return [mix(SPOTS[4], SPOTS[0], ease((f - 0.5) / 0.5))];
		}
		const placed = SPOTS.slice(0, Math.max(1, tick - 1));
		return tick === 1 ? placed : [...placed, mix(SPOTS[tick - 2], SPOTS[tick - 1], move)];
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
	<!-- read out as one picture with its meaning, not as the cryptic digits -->
	<div
		class="dayclock"
		class:inline
		role="img"
		aria-label="day {ordinal} of {now.getFullYear()}, {percent.join('.')}% of the day"
		title="day {ordinal} of {now.getFullYear()}, {percent.join('.')}% of the day"
	>
		<span class="date">{now.getFullYear()}-{day.slice(0, 2)}<span class="dot">•</span>{day[2]}</span>
		<span class="time">{percent[0]}<small>.{percent[1]}%</small></span>
		{#if icon === 'grid'}
			<svg class="grid" viewBox="0 0 12 12" width="13" height="13" aria-hidden="true">
				{#each dots as [x, y], i (i)}
					<circle cx={x} cy={y} r="1.1" />
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

	.grid circle {
		fill: currentColor;
		stroke: none;
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
