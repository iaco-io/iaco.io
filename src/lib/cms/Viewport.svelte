<script>
	// how this device measures the screen, for fixing layout gaps on iphones (shown by tapping the version
	// three times). tap the panel to close it
	let { onclose } = $props();

	/** @type {HTMLElement | undefined} */
	let probe = $state();
	let rows = $state(/** @type {[string, string][]} */ ([]));

	function measure() {
		if (!probe) return;
		const px = (/** @type {string} */ css) => {
			probe.style.cssText = `position:fixed;left:0;top:0;width:1px;visibility:hidden;height:${css}`;
			return Math.round(probe.getBoundingClientRect().height);
		};
		const fixed = (() => {
			probe.style.cssText = 'position:fixed;inset:0;visibility:hidden';
			const r = probe.getBoundingClientRect();
			return `${Math.round(r.top)} → ${Math.round(r.bottom)}`;
		})();
		const vv = window.visualViewport;
		rows = [
			['app', matchMedia('(display-mode: standalone)').matches ? 'home screen' : 'browser'],
			['screen', `${screen.width} × ${screen.height}`],
			['innerHeight', String(innerHeight)],
			['clientHeight', String(document.documentElement.clientHeight)],
			['visual viewport', vv ? `${Math.round(vv.height)} (top ${Math.round(vv.offsetTop)})` : '—'],
			['fixed area', fixed],
			['100vh / dvh / svh / lvh', [px('100vh'), px('100dvh'), px('100svh'), px('100lvh')].join(' / ')],
			['phantom gap (fixed)', String(px('var(--phantom)'))],
			['safe top / bottom', `${px('env(safe-area-inset-top, 0px)')} / ${px('env(safe-area-inset-bottom, 0px)')}`],
			['scrollY', String(Math.round(scrollY))]
		];
	}

	$effect(() => {
		measure();
		// kept up to date while it's open, so it shows how things settle, not just the first moment
		const timer = setInterval(measure, 500);
		addEventListener('resize', measure);
		window.visualViewport?.addEventListener('resize', measure);
		return () => {
			clearInterval(timer);
			removeEventListener('resize', measure);
			window.visualViewport?.removeEventListener('resize', measure);
		};
	});
</script>

<span bind:this={probe}></span>
<button class="viewport" onclick={onclose} aria-label="close">
	{#each rows as [k, v]}<span>{k}</span><b>{v}</b>{/each}
</button>

<style>
	.viewport {
		position: fixed;
		z-index: 100;
		top: calc(var(--top) + 1rem);
		left: 1rem;
		right: 1rem;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.3rem 1rem;
		padding: 1rem;
		border: 0;
		border-radius: 1rem;
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		color: var(--fg);
		background: var(--bg);
		box-shadow: 0 6px 24px var(--shadow);
	}

	span {
		color: var(--muted);
	}
</style>
