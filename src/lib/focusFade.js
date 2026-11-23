// Svelte action for a grid: each child is fully opaque while its middle is in the middle part of the screen
// (between 30% and 70% of its height), and dim (`min`) outside it. the change is instant, no fading
export function focusFade(node, min = 0.3) {
	let frame = 0;

	const update = () => {
		frame = 0;
		const mid = innerHeight / 2;
		for (const el of node.children) {
			const r = el.getBoundingClientRect();
			const near = Math.abs(r.top + r.height / 2 - mid) < mid * 0.4;
			el.style.opacity = near ? '1' : String(min);
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
