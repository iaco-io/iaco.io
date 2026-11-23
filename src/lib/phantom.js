// iphone home-screen apps (added from safari): the page starts under the clock, and at times ios doesn't make it
// taller, so it stops short of the bottom by up to the clock's height. app.css keeps the page at least as tall
// as the screen, which is what makes ios use all of it; in case it still doesn't, this measures the shortfall
// into --phantom (which things at the bottom move down by) whenever the page's height changes. 0 elsewhere

/** keeps --phantom up to date; returns a function that stops */
export function watchPhantom() {
	const probe = document.createElement('div');
	probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
	document.body.append(probe);
	let last = -1;
	let frame = 0;
	const update = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			let gap = 0;
			if (matchMedia('(display-mode: standalone)').matches) {
				const landscape = matchMedia('(orientation: landscape)').matches;
				const full = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
				gap = Math.max(0, Math.min(full - innerHeight, probe.offsetHeight));
			}
			if (gap !== last) document.documentElement.style.setProperty('--phantom', `${(last = gap)}px`);
		});
	};
	update();
	addEventListener('resize', update);
	addEventListener('orientationchange', update);
	addEventListener('pageshow', update);
	return () => {
		removeEventListener('resize', update);
		removeEventListener('orientationchange', update);
		removeEventListener('pageshow', update);
		cancelAnimationFrame(frame);
		probe.remove();
	};
}
