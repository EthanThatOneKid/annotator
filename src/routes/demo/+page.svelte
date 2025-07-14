<script lang="ts">
	import type { PageProps } from './$types';
	import Annotator from '$lib/components/annotator/annotator.svelte';
	import { CafeService } from './cafe';

	let { data }: PageProps = $props();

	const service = new CafeService();
</script>

<Annotator {...data} {service} />
