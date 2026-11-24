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

	// for keyboards and screen readers it acts as a dialog: while open, focus moves into it and the page behind
	// can't be reached (inert, but live messages stay heard); when it closes, focus goes back where it was
	/** @type {HTMLElement | undefined} */
	let layer = $state();
	$effect(() => {
		if (!open || !layer?.parentElement) return;
		const back = /** @type {HTMLElement | null} */ (document.activeElement);
		const behind = [...layer.parentElement.children].filter(
			(e) => e !== layer && !(/** @type {HTMLElement} */ (e).inert) && !e.matches('[role=status]')
		);
		for (const e of behind) /** @type {HTMLElement} */ (e).inert = true;
		/** @type {HTMLElement | null | undefined} */ (panel?.querySelector('.close'))?.focus({ preventScroll: true });
		return () => {
			for (const e of behind) /** @type {HTMLElement} */ (e).inert = false;
			back?.focus({ preventScroll: true });
		};
	});

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
		// the page behind holds still; a long list in the menu scrolls itself
		const still = (/** @type {Event} */ e) => !inList(e.target) && e.preventDefault();
		addEventListener('wheel', still, { passive: false });
		// iphone home-screen apps can change the visible height right after it opens (see phantom.js): follow it
		const follow = () => !drag && place();
		window.visualViewport?.addEventListener('resize', follow);
		return () => {
			removeEventListener('wheel', still);
			window.visualViewport?.removeEventListener('resize', follow);
		};
	});

	// a part of the menu that scrolls on its own (marked .scrolls), with more than fits
	const inList = (/** @type {EventTarget | null} */ t) => {
		const list = t instanceof Element ? t.closest('.scrolls') : null;
		return !!list && list.scrollHeight > list.clientHeight;
	};

	// dragging: `shift` is how far the panel is pushed out to the right (0 = fully open)
	/** @type {HTMLElement | undefined} */
	let panel = $state();
	/** @type {{ x: number, y: number, from: boolean, width: number, horizontal: boolean | null, lastX: number, lastT: number, speed: number, list: boolean } | null} */
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
		start = { x, y, from: open, width: panel?.offsetWidth ?? 320, horizontal: null, lastX: x, lastT: e.timeStamp, speed: 0, list: open && inList(e.target) };
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
		// open, the page behind doesn't scroll; the menu's own list may, unless this is a sideways drag
		if (open && !(d.list && !d.horizontal)) e.preventDefault();
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

	// on a desktop, a sideways two-finger swipe on a trackpad does the same as a finger: it pulls the panel in
	// from the right (swipe left), or pushes it out (swipe right). the trackpad sends no end, so a short pause
	// settles it; the glide after the fingers lift is ignored for a moment
	let pause = 0;
	let calm = 0;
	/** @param {WheelEvent} e */
	function wheel(e) {
		if (!edge && !open) return;
		if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.timeStamp < calm) return;
		// something under the pointer that scrolls sideways keeps the swipe for itself
		for (let el = /** @type {Element | null} */ (e.target); el && el !== document.body; el = el.parentElement)
			if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) return;
		// closed, only a swipe to the left pulls it in (a swipe right stays the browser's, back in history)
		if (!drag && !open && e.deltaX <= 0) return;
		e.preventDefault();
		if (!drag) {
			if (!open) place();
			const width = panel?.offsetWidth ?? 320;
			drag = { x: 0, y: 0, from: open, width, horizontal: true, lastX: 0, lastT: e.timeStamp, speed: 0, list: false };
			shift = open ? 0 : width;
		}
		const d = drag;
		const dt = e.timeStamp - d.lastT;
		if (dt > 0) d.speed = d.speed * 0.5 + (-e.deltaX / dt) * 0.5;
		d.lastT = e.timeStamp;
		shift = Math.min(d.width, Math.max(0, shift - e.deltaX));
		clearTimeout(pause);
		pause = window.setTimeout(() => {
			touchend();
			calm = performance.now() + 400;
		}, 140);
	}

	$effect(() => {
		addEventListener('wheel', wheel, { passive: false });
		return () => removeEventListener('wheel', wheel);
	});

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
<div bind:this={layer} class="layer" style:top="{top}px" style:height="{height}px" style:--bleed="{BLEED}px">
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
		id="panel"
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
		padding: calc(var(--bleed) + var(--top) + 5.5rem) 2rem calc(var(--bleed) - var(--phantom) + env(safe-area-inset-bottom) + 2rem);
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
		z-index: 1; /* above a list scrolled up under it */
		top: calc(var(--bleed) + var(--top) + var(--gap));
		right: var(--gap);
	}

	/* fills the panel, so content can push itself down with margin-top: auto. a part of it marked .scrolls
	   may scroll on its own (the blog's list of links) */
	.main {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
	}

	.bottom {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	/* a menu's list of links (see menuList.js): scrolls on its own, from the top of the screen (the room for the
	   close button is padding, so it scrolls away under it), fading at the bottom while there is more below */
	.panel :global(.entries.scrolls) {
		flex: 0 1 auto;
		min-height: 0;
		margin: calc(-1 * (var(--top) + 5.5rem)) -0.5rem 0;
		padding: calc(var(--top) + 5.5rem) 0.5rem 0.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.panel :global(.entries.scrolls::-webkit-scrollbar) {
		display: none;
	}

	.panel :global(.entries.more) {
		-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 4rem), transparent);
		mask-image: linear-gradient(to bottom, #000 calc(100% - 4rem), transparent);
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
