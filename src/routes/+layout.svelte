<script lang="ts">
	import Foot from '$lib/components/foot.svelte';

	let { children } = $props();
</script>

{@render children()}

<Foot />
