// Svelte action for a grid: each child is fully opaque near the vertical
// middle of the screen and fades towards `min` as it moves away from it.
export function focusFade(node, min = 0.3) {
	let frame = 0;

	const update = () => {
		frame = 0;
		const mid = innerHeight / 2;
		for (const el of node.children) {
			const r = el.getBoundingClientRect();
			const d = Math.min(Math.abs(r.top + r.height / 2 - mid) / mid, 1);
			el.style.opacity = 1 - (1 - min) * d;
		}
	};
	const schedule = () => (frame ||= requestAnimationFrame(update));

	addEventListener('scroll', schedule, { passive: true });
	addEventListener('resize', schedule);
	update();

	return {
		destroy() {
			removeEventListener('scroll', schedule);
			removeEventListener('resize', schedule);
			cancelAnimationFrame(frame);
		}
	};
}
