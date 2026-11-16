<script>
	// a little tower clock, top right. the pendulum swings each 0.864 s (a hundred-thousandth of a day).
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
		<svg viewBox="0 0 28 32" width="26" height="30" aria-hidden="true">
			<path d="M14 1.5v2.5" />
			<path d="M4.5 12 14 4l9.5 8Z" />
			<rect x="6.5" y="12" width="15" height="18.5" rx="1.5" />
			<circle cx="14" cy="17" r="4.2" />
			<path d="M14 17V14.6" style:transform="rotate({hours}deg)" />
			<path d="M14 17V13.5" style:transform="rotate({minutes}deg)" />
			<g class="pendulum" style:animation-delay="{delay}s">
				<path d="M14 21.6v5.4" />
				<circle cx="14" cy="27.6" r="1.3" />
			</g>
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
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	svg path,
	.pendulum {
		transform-origin: 14px 17px;
		transform-box: view-box;
	}

	.pendulum {
		transform-origin: 14px 21.6px;
		animation: swing 1.728s ease-in-out infinite;
	}

	@keyframes swing {
		0%,
		100% {
			transform: rotate(-16deg);
		}
		50% {
			transform: rotate(16deg);
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
