<script>
	// a small sitelen pona keyboard: tapping a glyph types its word into the text, and stays open.
	// it floats just above the phone keyboard, and never takes the focus away from the text
	import { X } from '@lucide/svelte';

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
</script>

<div class="keys glass" style:bottom="{bottom}px" role="dialog" aria-label="sitelen pona">
	<div class="head">
		<span>sitelen pona</span>
		<button class="close" aria-label="close" onpointerdown={keep} onclick={onclose}><X size={18} /></button>
	</div>
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
		padding: 0.6rem;
		border-radius: 1.25rem;
		transform: translateX(-50%);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.3rem 0.4rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted);
	}

	.close {
		display: flex;
		padding: 0.35rem;
		border: 0;
		border-radius: 999px;
		color: var(--muted);
		background: none;
		cursor: pointer;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(3.4rem, 1fr));
		gap: 0.25rem;
		max-height: min(16rem, 35vh);
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
