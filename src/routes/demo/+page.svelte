<script lang="ts">
	import type { PageProps } from './$types';
	import Annotator from '$lib/components/annotator/annotator.svelte';
	import { CompromiseService } from '$lib/services/annotator/compromise/compromise';

	let { data }: PageProps = $props();

	const service = new CompromiseService();
</script>

<Annotator {...data} {service} />
