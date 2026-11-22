<script>
	// the deployed version number, as a button: it drops cached files and loads the newest version
	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
			await (await navigator.serviceWorker?.getRegistration())?.update();
		} catch {}
		location.reload();
	}
</script>

<button class="version" class:refreshing onclick={refresh} aria-label="refresh to the newest version (v {__VERSION__})">
	v {__VERSION__}
</button>

<style>
	/* the same size and look as the rain button */
	.version {
		display: inline-flex;
		align-items: center;
		height: 2.4rem;
		padding: 0 1.4rem;
		border: 0;
		border-radius: 999px;
		font: inherit;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--muted);
		background: transparent;
		cursor: pointer;
		transition: background 0.3s ease;
	}

	.version:active {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		transition: none;
	}

	.refreshing {
		animation: pulse 0.8s ease-in-out infinite alternate;
	}

	@keyframes pulse {
		to {
			opacity: 0.35;
		}
	}
</style>
