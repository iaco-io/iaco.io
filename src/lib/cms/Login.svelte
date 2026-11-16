<script>
	import { KeyRound } from '@lucide/svelte';

	/** @type {{ onlogin: (token: string) => Promise<void> }} */
	let { onlogin } = $props();

	let token = $state('');
	let error = $state('');
	let busy = $state(false);

	/** @param {SubmitEvent} e */
	async function submit(e) {
		e.preventDefault();
		busy = true;
		error = '';
		try {
			await onlogin(token.trim());
		} catch (err) {
			error = /** @type {Error} */ (err).message;
		}
		busy = false;
	}
</script>

<form class="card glass" onsubmit={submit} autocomplete="on">
	<h1>iaco.io <small>v {__VERSION__}</small></h1>
	<p>log in with a github token that can write to the blog repo.</p>

	<!-- lets password managers save the token under a username -->
	<input class="hidden" type="text" name="username" autocomplete="username" value="iaco-io" readonly tabindex="-1" />

	<label>
		<span>github token</span>
		<input
			type="password"
			name="password"
			autocomplete="current-password"
			placeholder="github_pat_…"
			bind:value={token}
			required
		/>
	</label>

	{#if error}<p class="error">{error}</p>{/if}

	<button class="pill" disabled={busy || !token.trim()}>
		<KeyRound size={18} />
		{busy ? 'checking…' : 'log in'}
	</button>
</form>

<style>
	form {
		width: min(24rem, 100%);
		margin: 0 auto;
		padding: 2rem;
		border-radius: 1.75rem;
		box-shadow: 0 10px 40px var(--shadow);
	}

	h1 {
		margin: 0;
		font-size: 2.2rem;
		letter-spacing: -0.04em;
	}

	h1 small {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--muted);
	}

	p {
		margin: 0.5rem 0 1.5rem;
		color: var(--muted);
		line-height: 1.45;
	}

	label span {
		display: block;
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
		font-weight: 600;
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
</style>
