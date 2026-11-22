// the list of links in a menu panel (the blog's and the cms's): it scrolls on its own, fades at the bottom
// while there is more below, and, when the menu opens with more than fits, dips a little and comes back to
// show it. use it on the list: {@attach menuList(() => open)}

/** @param {() => boolean} isOpen */
export const menuList = (isOpen) => (/** @type {HTMLElement} */ el) => {
	el.classList.add('scrolls');
	const measure = () => el.classList.toggle('more', el.scrollTop + el.clientHeight < el.scrollHeight - 1);
	const observer = new ResizeObserver(measure);
	observer.observe(el);
	el.addEventListener('scroll', measure, { passive: true });

	// the dip, drawn frame by frame (smooth scrolling can be cut short); only the opening starts or stops it
	let frame = 0;
	let wait = 0;
	if (isOpen() && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
		wait = window.setTimeout(() => {
			if (el.scrollHeight <= el.clientHeight) return;
			const start = performance.now();
			const step = (/** @type {number} */ now) => {
				const t = Math.min(1, (now - start) / 500);
				el.scrollTop = Math.round(48 * Math.sin(Math.PI * t));
				if (t < 1) frame = requestAnimationFrame(step);
			};
			frame = requestAnimationFrame(step);
		}, 450);
	}
	return () => {
		observer.disconnect();
		el.removeEventListener('scroll', measure);
		clearTimeout(wait);
		cancelAnimationFrame(frame);
		el.scrollTop = 0;
	};
};
