<script>
	// a small sitelen pona keyboard (two rows, scrolls): tapping a glyph types its word into the text, and stays open.
	// it floats just above the phone keyboard and never takes the focus from the text.
	// tapping anywhere else closes it, except the text itself and its own button

	/** @type {{ oninsert: (word: string) => void, onclose: () => void }} */
	let { oninsert, onclose } = $props();

	// the words of lipu pu first, then the extra words this font knows
	const PU = 'a akesi ala alasa ale ali anpa ante anu awen e en esun ijo ike ilo insa jaki jan jelo jo kala kalama kama kasi ken kepeken kili kiwen ko kon kule kulupu kute la lape laso lawa len lete li lili linja lipu loje lon luka lukin lupa ma mama mani meli mi mije moku moli monsi mu mun musi mute nanpa nasa nasin nena ni nimi noka o olin ona open pakala pali palisa pan pana pi pilin pimeja pini pipi poka poki pona pu sama seli selo seme sewi sijelo sike sin sina sinpin sitelen sona soweli suli suno supa suwi tan taso tawa telo tenpo toki tomo tu unpa uta utala walo wan waso wawa weka wile'.split(' ');
	const EXTRA = 'alu alulawala amanka apeja awase bruh enko epiku epikule ete ewe iki ipi isipin itomi jaku jalan jami jasima je jew jewnikijetesantakalu jonke kalikun kamalawala kan kapa kapesi kapilala ke kese ki kijetesantakalu kijetesantakawaso kiki kin kipisi kokosila kosan ku kulepiku kulu kuntu lanpan leko likujo linluwi lipamanka lokon lox lu majuna majuto makojo melome meso mijomi misa misikeke monsuta muje mulapisu muli n namako nata natu neja nimisin nja oke okepuma oki oko omekapo omen oni opasan pa pake pasila pata peto pipo po polinpin pomotolo powe puwa samu san sikomo slape soko soto soweloje sowoli su sutopatikuna taki te teje ten tenpolawa tm to tonsi tuli umesu unikijetesantakalawa unikijetesantakalu unu usawi wa waken waleja wawajete we wekama yupekosi'.split(' ');

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

{#snippet key(/** @type {string} */ word)}
	<button title={word} onpointerdown={keep} onclick={() => oninsert(word)}>
		<tp>{word}</tp>
		<small>{word}</small>
	</button>
{/snippet}

<div class="keys glass" bind:this={panel} style:bottom="{bottom}px" role="dialog" aria-label="sitelen pona">
	<div class="grid">
		{#each PU as word (word)}{@render key(word)}{/each}
		<hr />
		{#each EXTRA as word (word)}{@render key(word)}{/each}
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
		grid-template-columns: repeat(7, 1fr);
		gap: 0.25rem;
		/* two rows; the rest scrolls */
		max-height: 6.9rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	/* between the words of pu and the extra ones */
	.grid hr {
		grid-column: 1 / -1;
		width: 100%;
		margin: 0.3rem 0;
		border: 0;
		border-top: 1px solid var(--glass-edge);
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
