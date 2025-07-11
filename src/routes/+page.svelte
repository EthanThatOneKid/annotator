<script lang="ts">
	import Annotator from '$lib/annotator/annotator.svelte';
	import { generateRandomAnnotations } from '$lib/annotator/random';
</script>

<Annotator generateAnnotations={(text) => generateRandomAnnotations(text, 1)} />
