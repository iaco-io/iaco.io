<script>
	import Entry from '#lib/Entry.svelte';

	let { data } = $props();
</script>

<Entry item={data.item} />
