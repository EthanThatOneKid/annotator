<script lang="ts">
	import Foot from '$lib/components/foot.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{@render children()}

<Foot />
