<script lang="ts">
	import Annotator from '$lib/annotator/annotator.svelte';
	import { generateCompromiseAnnotations } from '$lib/annotator/compromise';
	// import { generateRandomAnnotations } from '$lib/annotator/random';
</script>

<Annotator generate={(text) => generateCompromiseAnnotations(text)} />
