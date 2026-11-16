<script>
	// shows text with <tp>…</tp> (sitelen pona) and <al>…</al> (iaco's alphabet) parts, for titles and descriptions
	import { tpParts } from './tp.js';

	/** @type {{ text: string }} */
	let { text } = $props();
</script>

{#each tpParts(text) as part}{#if part.kind === 'tp'}<tp>{part.text}</tp>{:else if part.kind === 'al'}<al>{part.text}</al>{:else}{part.text}{/if}{/each}
