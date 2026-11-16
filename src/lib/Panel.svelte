<script>
	// a glass panel that slides in from the right over a dimmed page.
	// safari 26 paints solid toolbars over anything *fixed* near the screen edges, so the panel and its
	// backdrop are placed in the page instead (absolute, where it is scrolled to), reaching well past the
	// screen so they also show through safari's glass bars. the page can't scroll while it's open.
	// with `edge`, it can be dragged in from the right edge and dragged out again, following the finger.
	import { X } from '@lucide/svelte';

	/**
	 * @type {{ open: boolean, label: string, edge?: boolean, children: import('svelte').Snippet, bottom?: import('svelte').Snippet }}
	 */
	let { open = $bindable(), label, edge = false, children, bottom } = $props();

	const close = () => (open = false);

	const BLEED = 200; // px drawn beyond the visible screen, above and below
	let top = $state(0);
	let height = $state(0);
	/** @type {ReturnType<typeof setTimeout>} */
	let timer;

	/** puts the layer where the page is scrolled to */
	function place() {
		clearTimeout(timer);
		const vv = window.visualViewport;
		top = (vv?.pageTop ?? window.scrollY) - BLEED;
		height = (vv?.height ?? window.innerHeight) + 2 * BLEED;
	}

	$effect(() => {
		if (!open) {
			// after sliding out, take no space, so the page doesn't get longer
			if (!drag) timer = setTimeout(() => (height = 0), 450);
			return;
		}
		place();
		const still = (/** @type {Event} */ e) => e.preventDefault();
		addEventListener('wheel', still, { passive: false });
		return () => removeEventListener('wheel', still);
	});

	// dragging: `shift` is how far the panel is pushed out to the right (0 = fully open)
	/** @type {HTMLElement | undefined} */
	let panel = $state();
	/** @type {{ x: number, y: number, from: boolean, width: number, horizontal: boolean | null, lastX: number, lastT: number, speed: number } | null} */
	let drag = $state(null);
	let shift = $state(0);
	const progress = $derived(drag ? 1 - shift / drag.width : open ? 1 : 0);

	// a touch only becomes a drag once it clearly moves sideways, so taps (like on the round buttons) stay taps
	/** @type {NonNullable<typeof drag> | null} */
	let start = null;

	/** @param {TouchEvent} e */
	function touchstart(e) {
		const { clientX: x, clientY: y } = e.touches[0];
		// closed: only from the right edge; open: anywhere
		if (!open && (!edge || x < window.innerWidth - 44)) return void (start = null);
		start = { x, y, from: open, width: panel?.offsetWidth ?? 320, horizontal: null, lastX: x, lastT: e.timeStamp, speed: 0 };
	}

	/** @param {TouchEvent} e */
	function touchmove(e) {
		const d = drag ?? start;
		if (!d) return;
		const { clientX: x, clientY: y } = e.touches[0];
		const dx = x - d.x;
		const dy = y - d.y;
		// decide early whether this is a sideways drag or a scroll; lean towards sideways
		if (d.horizontal === null && Math.hypot(dx, dy) > 5) d.horizontal = Math.abs(dx) > Math.abs(dy) * 0.6;
		// finger speed in px/ms (negative = moving left), for flicks
		const dt = e.timeStamp - d.lastT;
		if (dt > 0) d.speed = d.speed * 0.5 + ((x - d.lastX) / dt) * 0.5;
		d.lastX = x;
		d.lastT = e.timeStamp;
		if (open) e.preventDefault();
		if (!d.horizontal) {
			if (d.horizontal === false) start = null;
			return;
		}
		e.preventDefault();
		if (!drag) {
			if (!open) place();
			drag = d;
			start = null;
		}
		shift = Math.min(d.width, Math.max(0, (d.from ? 0 : d.width) + dx));
	}

	function touchend() {
		start = null;
		if (!drag) return;
		const ratio = 1 - shift / drag.width;
		const speed = drag.speed;
		drag = null;
		// a quick flick decides on its own; otherwise it settles on the nearer side
		const next = speed < -0.3 ? true : speed > 0.3 ? false : ratio > 0.4;
		if (next === open && !open) height = 0;
		open = next;
	}

	$effect(() => {
		addEventListener('touchstart', touchstart, { passive: true });
		addEventListener('touchmove', touchmove, { passive: false });
		addEventListener('touchend', touchend);
		addEventListener('touchcancel', touchend);
		return () => {
			removeEventListener('touchstart', touchstart);
			removeEventListener('touchmove', touchmove);
			removeEventListener('touchend', touchend);
			removeEventListener('touchcancel', touchend);
		};
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<!-- clips the panel while it slides, so the page never gets wider; takes no space when closed -->
<div class="layer" style:top="{top}px" style:height="{height}px" style:--bleed="{BLEED}px">
	<div
		class="backdrop"
		class:open={open || drag}
		class:dragging={drag}
		style:opacity={drag ? progress : null}
		onclick={close}
		aria-hidden="true"
	></div>

	<nav
		bind:this={panel}
		class="panel glass"
		class:open={open || drag}
		class:dragging={drag}
		style:transform={drag ? `translateX(${shift}px)` : null}
		aria-label={label}
		inert={!open}
	>
		<button class="round glass close" onclick={close} aria-label="Close menu">
			<X size={20} />
		</button>
		<div class="main">{@render children()}</div>
		{#if bottom}<div class="bottom">{@render bottom()}</div>{/if}
	</nav>
</div>

<style>
	.layer {
		position: absolute;
		right: 0;
		left: 0;
		z-index: 20;
		overflow: hidden;
		pointer-events: none;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		background: var(--scrim);
		opacity: 0;
		pointer-events: none;
		visibility: hidden;
		transition:
			opacity 0.35s ease,
			visibility 0s 0.35s;
	}

	.backdrop.open {
		opacity: 1;
		pointer-events: auto;
		visibility: visible;
		transition: opacity 0.35s ease;
	}

	.panel {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		width: min(22rem, 85vw);
		overflow: hidden;
		/* the bleed above and below is padding, so the content sits on the visible screen */
		padding: calc(var(--bleed) + var(--top) + 5.5rem) 2rem calc(var(--bleed) + env(safe-area-inset-bottom) + 2rem);
		background: var(--panel);
		border-width: 0 0 0 1px;
		transform: translateX(100%);
		visibility: hidden;
		transition:
			transform 0.45s cubic-bezier(0.32, 0.72, 0, 1),
			visibility 0s 0.45s;
	}

	/* while dragging, follow the finger with no delay */
	.dragging {
		transition: none !important;
	}

	.panel.open {
		transform: none;
		visibility: visible;
		pointer-events: auto;
		transition: transform 0.45s cubic-bezier(0.32, 0.72, 0, 1);
	}

	.close {
		position: absolute;
		top: calc(var(--bleed) + var(--top) + var(--gap));
		right: var(--gap);
	}

	/* fills the panel, so content can push itself down with margin-top: auto */
	.main {
		display: flex;
		flex: 1;
		flex-direction: column;
	}

	.bottom {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	/* big menu entries, shared by the blog and the cms */
	.panel :global(.entries) {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.panel :global(.entry) {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.6rem 0;
		border: 0;
		background: none;
		font-family: inherit;
		font-size: 1.75rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--fg);
		text-align: left;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.panel :global(.entry:hover),
	.panel :global(.entry.active) {
		color: var(--accent);
	}
</style>
