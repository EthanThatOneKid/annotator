<script lang="ts">
	import type { PageProps } from './$types';
	import type { AnnotateResponse } from '$lib/services/annotator/annotator';
	import { CompromiseAnnotator } from '$lib/services/annotator/compromise/compromise';
	import { MediawikiOpensearch } from '$lib/services/semantic-search/mediawiki-opensearch/mediawiki-opensearch';
	import Annotator from '$lib/components/annotator/annotator.svelte';

	let { data }: PageProps = $props();

	let textContent = $state<string | null>(data.textContent);
	let generatedAnnotateResponse = $state<AnnotateResponse | null>(null);
	let isGenerating = $state(false);

	$effect(() => {
		if (textContent === null || isGenerating) {
			return;
		}

		isGenerating = true;
		annotator
			.annotate(textContent)
			.then((response) => {
				generatedAnnotateResponse = response;
			})
			.finally(() => {
				isGenerating = false;
			});
	});

	const semanticSearch = new MediawikiOpensearch();
	const annotator = new CompromiseAnnotator(semanticSearch);

	async function handleFormSubmit(event: Event & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();

		const form = event.currentTarget;
		const formData = new FormData(form);
		const currentText = formData.get('textContent');
		if (typeof currentText !== 'string') {
			throw new Error('Text content must be a string');
		}

		generatedAnnotateResponse = await annotator.annotate(currentText);
		textContent = currentText;
	}

	function handleGoBack() {
		textContent = null;
	}
</script>

{#if textContent !== null && generatedAnnotateResponse !== null}
	<Annotator {textContent} generated={generatedAnnotateResponse} {semanticSearch} />
	<button type="button" onclick={handleGoBack}>Go back</button>
{:else}
	<div class="source-input-container">
		{#if !isGenerating}
			<form onsubmit={handleFormSubmit}>
				<textarea rows="4" cols="40" name="textContent" placeholder="Type or edit text here..."
					>{textContent}</textarea
				>
				<button type="submit">Submit</button>
			</form>
		{:else}
			<!-- TODO: Abstract spinner into a reusable component. -->
			<div class="spinner-container">
				<div class="spinner"></div>
				<span>Loading annotations&hellip;</span>
			</div>
		{/if}
	</div>
{/if}
