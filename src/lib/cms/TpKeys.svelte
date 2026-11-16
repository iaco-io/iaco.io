<script>
	// a small sitelen pona keyboard (two rows, scrolls): tapping a glyph types its word into the text, and stays open.
	// it floats just above the phone keyboard and never takes the focus from the text.
	// tapping anywhere else closes it, except the text itself and its own button

	/** @type {{ oninsert: (word: string) => void, onclose: () => void }} */
	let { oninsert, onclose } = $props();

	const WORDS = 'a akesi ala alasa ale ali anpa ante anu apeja awen e en epiku esun ijo ike ilo insa jaki jan jasima jelo jo kala kalama kama kasi ken kepeken kijetesantakalu kili kin kipisi kiwen ko kokosila kon ku kule kulupu kute la lanpan lape laso lawa leko len lete li lili linja linluwi lipu loje lon luka lukin lupa ma majuna mama mani meli meso mi mije misikeke moku moli monsi monsuta mu mun musi mute n namako nanpa nasa nasin nena ni nimi noka o oko olin ona open pakala pake pali palisa pan pana pi pilin pimeja pini pipi poka poki pona powe pu sama seli selo seme sewi sijelo sike sin sina sinpin sitelen soko sona soweli su suli suno supa suwi tan taso tawa telo tenpo toki tomo tonsi tu unpa uta utala walo wan waso wawa weka wile'.split(' ');

	// stay above the on-screen keyboard
	let bottom = $state(0);
	$effect(() => {
		const vv = window.visualViewport;
		if (!vv) return;
		const place = () => (bottom = Math.max(0, innerHeight - vv.height - vv.offsetTop));
		place();
		vv.addEventListener('resize', place);
		vv.addEventListener('scroll', place);
		return () => {
			vv.removeEventListener('resize', place);
			vv.removeEventListener('scroll', place);
		};
	});

	const keep = (/** @type {Event} */ e) => e.preventDefault();

	/** @type {HTMLElement | undefined} */
	let panel = $state();
	$effect(() => {
		const outside = (/** @type {PointerEvent} */ e) => {
			const target = /** @type {Element} */ (e.target);
			if (panel?.contains(target) || target.closest?.('textarea:not(.grow), .sp')) return;
			onclose();
		};
		addEventListener('pointerdown', outside, true);
		return () => removeEventListener('pointerdown', outside, true);
	});
</script>

<div class="keys glass" bind:this={panel} style:bottom="{bottom}px" role="dialog" aria-label="sitelen pona">
	<div class="grid">
		{#each WORDS as word (word)}
			<button title={word} onpointerdown={keep} onclick={() => oninsert(word)}>
				<tp>{word}</tp>
				<small>{word}</small>
			</button>
		{/each}
	</div>
</div>

<style>
	.keys {
		position: fixed;
		left: 50%;
		z-index: 30;
		width: min(36rem, calc(100vw - 1rem));
		margin-bottom: 0.5rem;
		padding: 0.4rem;
		border-radius: 1.25rem;
		transform: translateX(-50%);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.4rem, 1fr));
		gap: 0.25rem;
		/* two rows; the rest scrolls */
		max-height: 6.9rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.grid button {
		display: grid;
		justify-items: center;
		gap: 0.1rem;
		padding: 0.35rem 0.1rem;
		border: 0;
		border-radius: 0.7rem;
		color: var(--fg);
		background: none;
		cursor: pointer;
		-webkit-user-select: none;
		user-select: none;
	}

	.grid button:active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.grid tp {
		font-size: 1.6rem;
		line-height: 1;
	}

	.grid small {
		max-width: 100%;
		overflow: hidden;
		font-size: 0.6rem;
		text-overflow: ellipsis;
		color: var(--muted);
	}
</style>
