<script>
	// a little old grandfather clock, top right. the pendulum swings each 0.864 s (a hundred-thousandth of a day).
	// next to it: the date as year and day of the year (2026-32•0), and the time as how much of the day has passed (45.67%)
	import { onMount } from 'svelte';

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
	const percent = $derived((Math.floor((sinceMidnight / DAY) * 10_000) / 100).toFixed(2).split('.'));
	// the hands show the usual time, the pendulum keeps in step with the day
	const hours = $derived(now ? ((now.getHours() % 12) + now.getMinutes() / 60) * 30 : 0);
	const minutes = $derived(now ? now.getMinutes() * 6 : 0);
	const delay = $derived(-((sinceMidnight % 1728) / 1000));
</script>

{#if now}
	<div class="dayclock" title="day {ordinal} of {now.getFullYear()}, {percent.join('.')}% of the day">
		<span class="date">{now.getFullYear()}-{day.slice(0, 2)}<span class="dot">•</span>{day[2]}</span>
		<span class="time">{percent[0]}<small>.{percent[1]}%</small></span>
		<!-- an old grandfather clock: arched hood with the face, a narrow case with a window for the pendulum, a base -->
		<svg viewBox="0 0 20 36" width="17" height="31" aria-hidden="true">
			<circle cx="10" cy="1.6" r=".8" />
			<path d="M4.5 12.5V6.2C4.5 3.9 7 2.6 10 2.6s5.5 1.3 5.5 3.6v6.3Z" />
			<circle cx="10" cy="7.6" r="3" />
			<path class="hand" d="M10 7.6V6" style:transform="rotate({hours}deg)" />
			<path class="hand" d="M10 7.6V5.1" style:transform="rotate({minutes}deg)" />
			<path d="M6 12.5v17.5h8V12.5" />
			<rect x="7.6" y="14.6" width="4.8" height="12.6" rx="2.4" />
			<g class="pendulum" style:animation-delay="{delay}s">
				<path d="M10 13.4v9.4" />
				<circle cx="10" cy="24" r="1.3" />
			</g>
			<path d="M4.8 30h10.4v2.2H4.8Z" />
			<path d="M5.8 32.2v1.5M14.2 32.2v1.5" />
		</svg>
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
		stroke-width: 1.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.hand {
		transform-box: view-box;
		transform-origin: 10px 7.6px;
	}

	.pendulum {
		transform-box: view-box;
		transform-origin: 10px 13.4px;
		animation: swing 1.728s ease-in-out infinite;
	}

	@keyframes swing {
		0%,
		100% {
			transform: rotate(-9deg);
		}
		50% {
			transform: rotate(9deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pendulum {
			animation: none;
		}
	}

	/* on big screens the menu button sits at the top right */
	@media (min-width: 768px) {
		.dayclock {
			right: calc(var(--gap) + 7.5rem);
		}
	}
</style>
