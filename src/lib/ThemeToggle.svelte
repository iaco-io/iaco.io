<script>
	import { onMount } from 'svelte';
	import { Sun, Monitor, Moon } from '@lucide/svelte';

	const options = [
		{ value: 'light', label: 'light', icon: Sun },
		{ value: 'system', label: 'system', icon: Monitor },
		{ value: 'dark', label: 'dark', icon: Moon }
	];

	let theme = $state('system');

	// three taps on "system" within 1 second open the cms
	/** @type {number[]} */
	let taps = [];
	function tap(/** @type {string} */ value) {
		if (value === 'system') {
			const now = Date.now();
			taps = [...taps.filter((t) => now - t < 1000), now];
			if (taps.length >= 3) {
				taps = [];
				window.open('/cms/', '_blank');
			}
		}
		set(value);
	}

	/** @param {string} value */
	function set(value) {
		theme = value;
		const root = document.documentElement;
		if (value === 'system') delete root.dataset.theme;
		else root.dataset.theme = value;

		try {
			if (value === 'system') localStorage.removeItem('theme');
			else localStorage.setItem('theme', value);
		} catch {}
	}

	onMount(() => set(document.documentElement.dataset.theme ?? 'system'));

	// like any radio group (wai-aria): one tab stop, the arrow keys pick the next or previous theme
	/** @param {KeyboardEvent} e */
	function keydown(e) {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
		if (!step) return;
		e.preventDefault();
		const i = (options.findIndex((o) => o.value === theme) + step + options.length) % options.length;
		set(options[i].value);
		/** @type {HTMLElement | null} */ (e.currentTarget instanceof HTMLElement ? e.currentTarget.children[i] : null)?.focus();
	}
</script>

<!-- the keys are handled on the group, focus stays on its radios (wai-aria radio group) -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="toggle glass" role="radiogroup" aria-label="theme" onkeydown={keydown}>
	{#each options as { value, label, icon: Icon }}
		<button
			role="radio"
			aria-checked={theme === value}
			tabindex={theme === value ? 0 : -1}
			aria-label={label}
			class:active={theme === value}
			onclick={() => tap(value)}
		>
			<Icon size={18} />
		</button>
	{/each}
</div>

<style>
	.toggle {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 999px;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: none;
		color: var(--muted);
		cursor: pointer;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}

	button.active {
		background: var(--bg);
		color: var(--fg);
		box-shadow: 0 0 8px var(--shadow-soft);
	}
</style>
