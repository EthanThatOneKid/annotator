<script lang="ts">
	import Annotator from '$lib/annotator/annotator.svelte';
	import { CompromiseService } from '$lib/annotator/services/compromise';

	const service = new CompromiseService();
</script>

<Annotator {service} text="My name is Ethan!" />
