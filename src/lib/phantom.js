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
	const root = document.documentElement;
	const update = () => {
		let gap = 0;
		// the page starts at the very top of the screen (under the clock): its top edge holds still, while ios
		// moves its bottom edge. things that must not jump (the round buttons) are then placed from the top,
		// with the screen's real height (--screen-bottom); html gets the class "pinned"
		const pinned = matchMedia('(display-mode: standalone)').matches && clock.offsetHeight > 0;
		if (pinned) {
			const landscape = matchMedia('(orientation: landscape)').matches;
			const full = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
			gap = Math.max(0, Math.min(full - area.offsetHeight, clock.offsetHeight));
			root.style.setProperty('--screen-bottom', `${full}px`);
		}
		root.classList.toggle('pinned', pinned);
		if (gap !== last) root.style.setProperty('--phantom', `${(last = gap)}px`);
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
