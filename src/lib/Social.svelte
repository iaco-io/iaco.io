<script>
	// lucide has no brand icons, so these are drawn in the same 24px stroke style
	const links = [
		{
			label: 'youtube',
			href: 'https://youtube.com/@iaco',
			d: 'M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17M10 15l5-3-5-3z'
		},
		{
			label: 'instagram',
			href: 'https://instagram.com/iaco.io',
			d: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01'
		},
		{
			label: 'tiktok',
			href: 'https://tiktok.com/@iaco.io',
			d: 'M9 12a4 4 0 1 0 4 4V2a5 5 0 0 0 5 5'
		},
		{
			label: 'twitch',
			href: 'https://twitch.tv/@iaco_io',
			d: 'M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M16 11V7'
		},
		{
			label: 'mastodon',
			href: 'https://c.im/@iaco',
			d: 'M21 13.5c-.3 1.6-2.7 3.3-5.4 3.6-1.4.2-2.8.3-4.3.2-2.4-.1-4.3-.6-4.3-.6v.7c.3 2.3 2.3 2.5 4.3 2.6 1.9.1 3.6-.5 3.6-.5l.1 1.7s-1.3.7-3.7.8c-1.3.1-2.9 0-4.8-.5C2.6 20.5 2.1 16.1 2 11.6V8c0-4.4 2.9-5.7 2.9-5.7C6.4 1.6 9 1.3 11.7 1.3h.1c2.7 0 5.3.3 6.8 1 0 0 2.9 1.3 2.9 5.7 0 0 0 3.2-.5 5.5zM7.5 12V8.5a2 2 0 0 1 4 0v2M11.5 10.5v-2a2 2 0 0 1 4 0V12'
		}
	];
</script>

<ul>
	{#each links as { label, href, d }}
		<li>
			<a class="round glass" {href} target="_blank" rel="noopener noreferrer me" aria-label={label}>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"><path {d} /></svg
				>
			</a>
		</li>
	{/each}
</ul>

<style>
	ul {
		display: flex;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		width: 2.75rem;
		height: 2.75rem;
	}
</style>
