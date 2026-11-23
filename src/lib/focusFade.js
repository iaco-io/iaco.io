// cards are fully opaque while their middle is in the middle part of the screen (between 25% and 75% of its
// height), and dim (`min`) outside it. the change is instant, no fading.
// focusFade: a Svelte action for a grid, on its children. fadeCards: for markdown, on every grid card inside
// (they can change, so they are looked up on each update)

/**
 * @param {HTMLElement} node
 * @param {() => Iterable<Element>} cards
 * @param {number} min
 */
function fade(node, cards, min) {
	let frame = 0;
	const update = () => {
		frame = 0;
		const mid = innerHeight / 2;
		for (const el of cards()) {
			const r = el.getBoundingClientRect();
			const near = Math.abs(r.top + r.height / 2 - mid) < mid * 0.5;
			/** @type {HTMLElement} */ (el).style.opacity = near ? '1' : String(min);
		}
	};
	const schedule = () => (frame ||= requestAnimationFrame(update));

	addEventListener('scroll', schedule, { passive: true });
	addEventListener('resize', schedule);
	const observer = new MutationObserver(schedule);
	observer.observe(node, { childList: true, subtree: true });
	update();

	return () => {
		removeEventListener('scroll', schedule);
		removeEventListener('resize', schedule);
		observer.disconnect();
		cancelAnimationFrame(frame);
	};
}

/** @param {HTMLElement} node */
export function focusFade(node, min = 0.3) {
	return { destroy: fade(node, () => node.children, min) };
}

/** @param {HTMLElement} node */
export const fadeCards = (node) => fade(node, () => node.querySelectorAll('.grid > .card'), 0.3);
