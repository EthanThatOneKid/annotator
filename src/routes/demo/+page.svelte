<script lang="ts">
	import type { PageProps } from './$types';
	import Annotator from '$lib/components/annotator/annotator.svelte';
	import { CafeSemanticSearch } from './cafe';

	let { data }: PageProps = $props();

	const semanticSearch = new CafeSemanticSearch();
</script>

<Annotator {...data} {semanticSearch} />
