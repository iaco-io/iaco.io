// iphone home-screen apps (added from safari): the page starts under the clock, and at times (without saying so)
// ios makes the area that fixed things sit in shorter than the screen, ending up to the clock's height above
// the bottom. this watches that area's size and puts the shortfall in --phantom, which things at the bottom
// move down by. 0 everywhere else, and whenever ios uses the whole screen

/** keeps --phantom up to date; returns a function that stops */
export function watchPhantom() {
	const probe = (/** @type {string} */ css) => {
		const el = document.createElement('div');
		el.style.cssText = `position:fixed;left:0;width:1px;visibility:hidden;pointer-events:none;${css}`;
		document.body.append(el);
		return el;
	};
	// the clock's height, and the area fixed things sit in
	const clock = probe('top:0;height:env(safe-area-inset-top,0px)');
	const area = probe('top:0;bottom:0');
	let last = -1;
	const update = () => {
		let gap = 0;
		if (matchMedia('(display-mode: standalone)').matches) {
			const landscape = matchMedia('(orientation: landscape)').matches;
			const full = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
			gap = Math.max(0, Math.min(full - area.offsetHeight, clock.offsetHeight));
		}
		if (gap !== last) document.documentElement.style.setProperty('--phantom', `${(last = gap)}px`);
	};
	update();
	// reports every change of the area's size, also the ones ios makes without a resize event
	const observer = new ResizeObserver(update);
	observer.observe(area);
	addEventListener('orientationchange', update);
	return () => {
		observer.disconnect();
		removeEventListener('orientationchange', update);
		clock.remove();
		area.remove();
	};
}
