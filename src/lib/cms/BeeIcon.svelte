<script>
	// a bee in lucide's style (lucide has none): round body with stripes, two wings, a little stinger
	let { size = 24, strokeWidth = 2 } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<ellipse cx="12" cy="14.5" rx="4.5" ry="6" />
	<path d="M7.6 12.5h8.8M7.6 16.5h8.8" />
	<path d="M8.5 9.5C6 9.5 3 8 3 5.5S6.5 3 9.5 7.5" />
	<path d="M15.5 9.5c2.5 0 5.5-1.5 5.5-4S17.5 3 14.5 7.5" />
	<path d="M12 20.5v1.5" />
</svg>
