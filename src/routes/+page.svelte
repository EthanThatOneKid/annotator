<script lang="ts">
	import { page } from '$app/state';
	import type { AnnotateResponse } from '$lib/services/annotator/annotator';
	import { CompromiseAnnotator } from '$lib/services/annotator/compromise/compromise';
	import { MediawikiOpensearch } from '$lib/services/semantic-search/mediawiki-opensearch/mediawiki-opensearch';
	import Annotator from '$lib/components/annotator/annotator.svelte';

	let textContent = $state<string | null>(null);
	let generatedAnnotateResponse = $state<AnnotateResponse | null>(null);
	let isGenerating = $state(false);
	let isAnnotating = $state(false);

	$effect(() => {
		textContent ??= page.url.searchParams.get('t');
		if (!isAnnotating || textContent === null || isGenerating) {
			return;
		}

		isGenerating = true;
		isAnnotating = false;

		annotator
			.annotate(textContent)
			.then((response) => {
				generatedAnnotateResponse = response;
			})
			.finally(() => {
				isGenerating = false;
			});
	});

	// Trigger annotation when textContent changes.
	$effect(() => {
		if (textContent !== null) {
			isAnnotating = true;
		}
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

		textContent = currentText;
		isAnnotating = true;

		const searchParams = new URLSearchParams(page.url.searchParams);
		searchParams.set('t', currentText);
		updateSearchParams(searchParams);
	}

	function handleGoBack() {
		textContent = null;
		generatedAnnotateResponse = null;
		isAnnotating = false;

		const updatedSearchParams = new URLSearchParams(page.url.searchParams);
		updatedSearchParams.delete('t');

		updateSearchParams(updatedSearchParams);
	}

	function updateSearchParams(searchParams: URLSearchParams) {
		const searchParamsString = searchParams.toString();
		history.pushState(
			null,
			'',
			`${location.pathname}${searchParamsString ? `?${searchParamsString}` : ''}${location.hash}`
		);
	}
</script>

<section
	class="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white"
>
	<div class="w-full max-w-xl rounded-xl bg-white p-8 shadow-lg">
		<h1 class="mb-4 text-center text-4xl font-extrabold tracking-tight text-green-800">
			Annotator
		</h1>

		<p class="mb-8 text-center text-lg text-gray-600">
			Highlight, annotate, and link resources to your text with ease.
		</p>

		{#if !isGenerating}
			{#if textContent !== null && generatedAnnotateResponse !== null}
				<div class="flex flex-col items-center justify-center">
					<Annotator bind:textContent generated={generatedAnnotateResponse} {semanticSearch} />

					<button
						type="button"
						onclick={handleGoBack}
						class="mt-6 rounded-lg border border-gray-300 bg-gray-100 px-6 py-2 text-lg font-medium transition hover:bg-gray-200"
						>Go back</button
					>
				</div>
			{:else}
				<form onsubmit={handleFormSubmit} class="flex flex-col gap-4">
					<textarea
						rows="5"
						cols="40"
						name="textContent"
						placeholder="Type or edit text here..."
						class="resize-vertical w-full rounded-lg border border-gray-300 bg-gray-50 p-4 text-lg shadow-inner focus:ring-2 focus:ring-green-700 focus:outline-none"
						>{textContent}</textarea
					>
					<button
						type="submit"
						class="self-end rounded-lg bg-green-700 px-6 py-2 text-lg font-semibold text-white shadow transition hover:bg-green-800"
						>Submit</button
					>
				</form>
			{/if}
		{:else}
			<div class="flex flex-col items-center justify-center py-12">
				<div
					class="mb-4 h-10 w-10 animate-spin rounded-full border-t-4 border-solid border-green-700"
				></div>
				<span class="text-lg text-gray-600">Loading annotations&hellip;</span>
			</div>
		{/if}
	</div>

	<!-- Scroll for more info -->
	<div class="absolute bottom-8 left-1/2 flex -translate-x-1/2 transform flex-col items-center">
		<span class="mb-2 text-sm text-gray-400">Scroll for more info</span>
		<svg
			class="h-6 w-6 animate-bounce text-green-700"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			viewBox="0 0 24 24"
			><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg
		>
	</div>
</section>

<!-- Info Section -->
<section class="bg-white px-4 py-20">
	<div class="mx-auto max-w-3xl text-center">
		<h2 class="mb-4 text-2xl font-bold text-green-800">How it works</h2>
		<p class="mb-6 text-gray-600">
			Paste or type your text above, highlight entities or topics, and link them to resources. Use
			the annotation dialog to manage and create new resources. Perfect for research, study, or
			content enrichment.
		</p>
		<div class="flex flex-col justify-center gap-8 md:flex-row">
			<div class="flex-1 rounded-lg bg-green-50 p-6 shadow">
				<h3 class="mb-2 text-lg font-semibold text-green-700">Smart Highlighting</h3>
				<p class="text-gray-600">
					Automatically detect and highlight key entities and topics in your text.
				</p>
			</div>
			<div class="flex-1 rounded-lg bg-green-50 p-6 shadow">
				<h3 class="mb-2 text-lg font-semibold text-green-700">Resource Linking</h3>
				<p class="text-gray-600">
					Associate highlights with resources, such as Wikipedia articles or your own notes.
				</p>
			</div>
			<div class="flex-1 rounded-lg bg-green-50 p-6 shadow">
				<h3 class="mb-2 text-lg font-semibold text-green-700">Easy Management</h3>
				<p class="text-gray-600">
					Edit, remove, or create new resources directly from the annotation dialog.
				</p>
			</div>
		</div>
	</div>
</section>
