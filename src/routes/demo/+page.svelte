<script lang="ts">
	import type { PageProps } from './$types';
	import Annotator from '$lib/annotator/annotator.svelte';

	let { data }: PageProps = $props();
</script>

<Annotator {...data} />
