<script lang="ts">
	import type { Annotation, Resource } from '$lib/annotator/annotation';
	import { CompromiseService } from '$lib/annotator/services/compromise';
	import Annotator from '$lib/annotator/annotator.svelte';

	const service = new CompromiseService();

	let text = $state<string | null>(null);
	let annotations = $state<Annotation[]>([]);
	let resources = $state<Resource[]>([]);

	async function handleFormSubmit(event: Event) {
		event.preventDefault();

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const currentText = formData.get('text');
		if (typeof currentText !== 'string') {
			throw new Error();
		}

		const data = await service.predict(currentText);
		text = currentText;
		annotations = data.annotations;
		resources = data.resources;
	}

	function handleGoBack() {
		text = null;
	}
</script>

{#if text !== null}
	<Annotator {text} {annotations} {resources} />
	<button type="button" onclick={handleGoBack}>Go back</button>
{:else}
	<div class="source-input-container">
		<form onsubmit={handleFormSubmit}>
			<textarea rows="3" cols="40" name="text" placeholder="Type or edit text here..."
				>{text}</textarea
			>
			<button type="submit">Submit</button>
		</form>
	</div>
{/if}
