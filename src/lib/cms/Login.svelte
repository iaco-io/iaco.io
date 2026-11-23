<script>
	import { KeyRound, Feather, ArrowLeft } from '@lucide/svelte';
	import SiteMap from './SiteMap.svelte';

	/** @type {{ onlogin: (token: string) => Promise<void> }} */
	let { onlogin } = $props();

	let token = $state('');
	let error = $state('');
	let busy = $state(false);

	// three taps on the feather within 1 second (like the theme switch's for the cms) open the site map
	let mapOpen = $state(false);
	/** @type {number[]} */
	let taps = [];
	function tapFeather() {
		const now = Date.now();
		taps = [...taps.filter((t) => now - t < 1000), now];
		if (taps.length >= 3) (taps = []), (mapOpen = true);
	}

	/** @param {SubmitEvent} [e] */
	async function submit(e) {
		e?.preventDefault();
		if (busy) return;
		busy = true;
		error = '';
		try {
			await onlogin(token.trim());
		} catch (err) {
			error = /** @type {Error} */ (err).message;
		}
		busy = false;
	}
	// a password manager (or a paste) fills the whole token at once: log in straight away
	let previous = 0;
	function autofill() {
		const jump = token.length - previous;
		previous = token.length;
		if (jump > 20 && /^(github_pat_|ghp_)\w{20,}$/.test(token.trim())) submit();
	}
</script>

<div class="login">
<form class="card glass" onsubmit={submit} autocomplete="on">
	<h1>iaco.io <small>v {__VERSION__}</small></h1>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<span class="feather" onclick={tapFeather}><Feather size={24} /></span>

	<!-- lets password managers save the token under a username -->
	<input class="hidden" type="text" name="username" autocomplete="username" value="iaco-io" readonly tabindex="-1" />

	<label>
		<input
			type="password"
			name="password"
			autocomplete="current-password"
			placeholder="token"
			aria-label="github token"
			bind:value={token}
			oninput={autofill}
			onchange={autofill}
			required
		/>
	</label>

	{#if error}<p class="error">{error}</p>{/if}

	<button class="pill" disabled={busy || !token.trim()}>
		<KeyRound size={18} />
		{busy ? 'checking…' : 'log in'}
	</button>
</form>

<!-- back to the blog (a full load: the blog is its own app) -->
<a class="pill back" href="/" data-sveltekit-reload><ArrowLeft size={18} /> return to blog</a>
</div>

{#if mapOpen}<SiteMap onclose={() => (mapOpen = false)} />{/if}

<style>
	.feather {
		position: absolute;
		top: 2rem;
		right: 2rem;
		display: flex;
		color: var(--soft);
		cursor: default;
		-webkit-user-select: none;
		user-select: none;
		touch-action: manipulation; /* quick taps aren't taken for a double-tap zoom */
	}

	form {
		position: relative;
		width: min(24rem, 100%);
		margin: 0 auto;
		padding: 2rem;
		border-radius: 1.75rem;
		box-shadow: 0 10px 40px var(--shadow);
	}

	h1 {
		margin: 0 0 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 1.7rem;
		letter-spacing: -0.04em;
	}

	h1 small {
		white-space: nowrap;
		position: relative;
		top: 0.15em;
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--muted);
	}

	.hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.error {
		margin: 1rem 0 0;
		color: #c0504d;
	}

	button {
		width: 100%;
		margin-top: 1.25rem;
	}

	/* the form and the way back stay together */
	.login {
		width: min(24rem, 100%);
		margin: 0 auto;
	}

	.back {
		display: flex;
		width: fit-content;
		margin: 0.85rem auto 0;
		text-decoration: none;
	}
</style>
