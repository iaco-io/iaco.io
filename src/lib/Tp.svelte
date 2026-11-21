<script>
	// shows text with <tp>…</tp> (sitelen pona) and <al>…</al> (iaco's alphabet) parts, for titles and descriptions
	import { tpParts } from './tp.js';

	/** @type {{ text: string }} */
	let { text } = $props();
	// toki pona is marked as such (lang tok) for screen readers; iaco's alphabet letters read badly aloud
	// (ʃ is "esh"), so screen readers get the plain words instead
</script>

{#each tpParts(text) as part}{#if part.kind === 'tp'}<tp lang="tok">{part.text}</tp>{:else if part.kind === 'al'}<al aria-hidden="true">{part.text}</al><span class="sr-only">{part.plain}</span>{:else}{part.text}{/if}{/each}
