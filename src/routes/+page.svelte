<script lang="ts">
	import type { AnnotateResponse } from '$lib/services/annotator/annotator';
	import { CompromiseService } from '$lib/services/annotator/compromise/compromise';
	import Annotator from '$lib/components/annotator/annotator.svelte';

	const service = new CompromiseService();

	let textContent = $state<string | null>(null);
	let generated = $state<AnnotateResponse | null>(null);

	async function handleFormSubmit(event: Event) {
		event.preventDefault();

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const currentText = formData.get('textContent');
		if (typeof currentText !== 'string') {
			throw new Error('Text must be a string');
		}

		generated = await service.annotate(currentText);
		textContent = currentText;
	}

	function handleGoBack() {
		textContent = null;
	}
</script>

{#if textContent !== null && generated !== null}
	<Annotator {textContent} {generated} {service} />
	<button type="button" onclick={handleGoBack}>Go back</button>
{:else}
	<div class="source-input-container">
		<form onsubmit={handleFormSubmit}>
			<textarea rows="4" cols="40" name="textContent" placeholder="Type or edit text here..."
				>{textContent}</textarea
			>
			<button type="submit">Submit</button>
		</form>
	</div>
{/if}
