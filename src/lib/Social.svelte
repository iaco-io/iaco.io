<script>
	// lucide has no brand icons, so these are drawn in its 24px stroke style
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
			// outline of the official mark (simple-icons, CC0), with a stroked m and eye
			d: 'M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zM11.6 15V8.4c0-1.7 1.1-2.7 2.7-2.7s2.9 1 2.9 2.7v3.4M17.2 11.8V8.4c0-1.7 1.3-2.7 2.9-2.7s2.6 1 3 2.2M6.6 7.6h.01',
			box: '-1.6 -1.6 27.2 27.2'
		}
	];
</script>

<ul>
	{#each links as { label, href, d, box }}
		<li>
			<a class="round glass" {href} target="_blank" rel="noopener noreferrer me" aria-label={label}>
				<svg
					width="18"
					height="18"
					viewBox={box ?? '0 0 24 24'}
					fill="none"
					stroke="currentColor"
					stroke-width={box ? 2.27 : 2}
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
