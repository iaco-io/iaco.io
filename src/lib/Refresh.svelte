<script>
	// drops cached files and loads the newest version, next to the deployed version number
	import { RotateCw } from '@lucide/svelte';

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

<button class="round glass refresh" class:spin={refreshing} onclick={refresh} aria-label="refresh">
	<RotateCw size={18} />
</button>
<span class="version">v {__VERSION__}</span>

<style>
	.refresh {
		width: 3.1rem;
		height: 3.1rem;
	}

	.spin :global(svg) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.version {
		margin-left: 0.25rem;
		font-size: 0.75rem;
		color: var(--muted);
	}
</style>
