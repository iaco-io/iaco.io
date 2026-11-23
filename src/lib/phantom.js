// iphone home-screen apps (added from safari): the page starts under the clock but isn't made taller, so it
// stops short of the bottom by up to the clock's height. this measures that shortfall once (and again when the
// screen turns) into --phantom, which things at the bottom move down by. 0 everywhere else, and once ios
// measures the page right. measured here, not in css: ios changes its viewport units while the menu slides in

/** keeps --phantom up to date; returns a function that stops */
export function watchPhantom() {
	const probe = document.createElement('div');
	probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
	document.body.append(probe);
	let last = -1;
	const update = () => {
		let gap = 0;
		if (matchMedia('(display-mode: standalone)').matches) {
			const landscape = matchMedia('(orientation: landscape)').matches;
			const full = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
			gap = Math.max(0, Math.min(full - innerHeight, probe.offsetHeight));
		}
		if (gap !== last) document.documentElement.style.setProperty('--phantom', `${(last = gap)}px`);
	};
	update();
	// only a real change of size (turning the phone) is worth a new measure
	let width = innerWidth;
	const resize = () => innerWidth !== width && ((width = innerWidth), update());
	addEventListener('resize', resize);
	addEventListener('orientationchange', update);
	return () => {
		removeEventListener('resize', resize);
		removeEventListener('orientationchange', update);
		probe.remove();
	};
}
