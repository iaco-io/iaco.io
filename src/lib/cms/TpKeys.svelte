<script>
	// a small sitelen pona keyboard (two rows, scrolls): tapping a glyph types its word into the text, and stays open.
	// it floats just above the phone keyboard and never takes the focus from the text.
	// tapping anywhere else closes it, except the text itself and its own button
	import { Star, Plus, Smile } from '@lucide/svelte';

	// docked: sits in the focus editor's bottom bar (above the toolbar) and only closes from its button
	/** @type {{ oninsert: (word: string) => void, onclose: () => void, docked?: boolean }} */
	let { oninsert, onclose, docked = false } = $props();

	// three groups: the words of lipu pu, the newer official ones (ku suli and unicode), then extras and for-fun words
	const PU = 'a akesi ala alasa ale ali anpa ante anu awen e en esun ijo ike ilo insa jaki jan jelo jo kala kalama kama kasi ken kepeken kili kiwen ko kon kule kulupu kute la lape laso lawa len lete li lili linja lipu loje lon luka lukin lupa ma mama mani meli mi mije moku moli monsi mu mun musi mute nanpa nasa nasin nena ni nimi noka o olin ona open pakala pali palisa pan pana pi pilin pimeja pini pipi poka poki pona pu sama seli selo seme sewi sijelo sike sin sina sinpin sitelen sona soweli suli suno supa suwi tan taso tawa telo tenpo toki tomo tu unpa uta utala walo wan waso wawa weka wile'.split(' ');
	const OFFICIAL = 'kin kipisi ku leko meso misikeke monsuta n namako oko soko tonsi epiku jasima lanpan linluwi majuna su kokosila apeja pake powe'.split(' ');
	const FUN = 'alu alulawala amanka awase bruh enko epikule ete ewe iki ipi isipin itomi jaku jalan jami je jew jewnikijetesantakalu jonke kalikun kamalawala kan kapa kapesi kapilala ke kese ki kijetesantakalu kijetesantakawaso kiki kosan kulepiku kulu kuntu likujo lipamanka lokon lox lu majuto makojo melome mijomi misa muje mulapisu muli nata natu neja nimisin nja oke okepuma oki omekapo omen oni opasan pa pasila pata peto pipo po polinpin pomotolo puwa samu san sikomo slape soto soweloje sowoli sutopatikuna taki te teje ten tenpolawa tm to tuli umesu unikijetesantakalawa unikijetesantakalu unu usawi wa waken waleja wawajete we wekama yupekosi'.split(' ');

	// stay above the on-screen keyboard
	let bottom = $state(0);
	$effect(() => {
		const vv = window.visualViewport;
		if (!vv || docked) return;
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
	let grid = $state();
	/** @type {(HTMLElement | undefined)[]} */
	let marks = $state([]);
	const jump = (/** @type {number} */ i) =>
		grid?.scrollTo({ top: i === 0 ? 0 : (marks[i]?.offsetTop ?? 0) - grid.offsetTop, behavior: 'smooth' });

	/** @type {HTMLElement | undefined} */
	let panel = $state();
	$effect(() => {
		if (docked) return;
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

<div class="keys glass" class:docked bind:this={panel} style:bottom={docked ? null : `${bottom}px`} role="dialog" aria-label="sitelen pona">
	<div class="grid" bind:this={grid}>
		<span class="mark" bind:this={marks[0]}></span>
		{#each PU as word (word)}{@render key(word)}{/each}
		<hr bind:this={marks[1]} />
		{#each OFFICIAL as word (word)}{@render key(word)}{/each}
		<hr bind:this={marks[2]} />
		{#each FUN as word (word)}{@render key(word)}{/each}
	</div>
	<!-- jump to a group -->
	<nav>
		<button aria-label="pu words" title="pu" onpointerdown={keep} onclick={() => jump(0)}><Star size={16} strokeWidth={1.5} /></button>
		<button aria-label="new official words" title="new official" onpointerdown={keep} onclick={() => jump(1)}><Plus size={16} strokeWidth={1.25} /></button>
		<button aria-label="extras and fun" title="extras and fun" onpointerdown={keep} onclick={() => jump(2)}><Smile size={16} strokeWidth={1.5} /></button>
	</nav>
</div>

<style>
	.keys {
		display: flex;
		gap: 0.3rem;
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

	.keys.docked {
		position: static;
		width: 100%;
		margin: 0;
		transform: none;
	}

	.grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.25rem;
		/* two rows; the rest scrolls */
		max-height: 6.9rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.mark {
		display: none;
	}

	nav {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.2rem;
	}

	nav button {
		display: flex;
		padding: 0.35rem;
		border: 0;
		border-radius: 999px;
		color: var(--muted);
		background: none;
		cursor: pointer;
	}

	nav button:active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	/* between the groups */
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
