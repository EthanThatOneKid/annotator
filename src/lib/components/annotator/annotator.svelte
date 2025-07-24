<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { Annotation, AnnotateResponse } from '$lib/services/annotator/annotator';
	import type { Resource, SemanticSearch } from '$lib/services/semantic-search/semantic-search';
	import { intersection, applyConfidentPrediction } from '$lib/services/annotator/annotator';
	import { processSearchResponse } from '$lib/services/annotator/process-search-response';
	import ResourceCard from '$lib/components/resource-card/resource-card.svelte';
	import { getCaretRange } from './caret';

	let {
		semanticSearch,
		generated,
		textContent = $bindable(),
		highlightKey = 'custom-highlight'
	}: {
		semanticSearch: SemanticSearch;
		generated: AnnotateResponse;
		textContent: string;
		highlightKey?: string;
	} = $props();

	// TODO: Use Svelte 5 class state for annotator component.
	let isGenerating = $state(false);
	let isSelecting = $state(false);
	let isEditingResource = $state(false);
	let caretRange = $state<Range | null>(null);
	let isModalOpen = $state(false);
	let textContainerElement = $state<HTMLDivElement | null>(null);
	const selectedAnnotations = new SvelteSet<Annotation>();
	const annotatedRanges = new SvelteMap<string, Range>();
	const annotations = new SvelteMap<string, Annotation>(
		generated.annotations.map((a) => [a.annotationId, applyConfidentPrediction(a)])
	);
	const resources = new SvelteMap<string, Resource>(
		generated.resources.map((r) => [r.resourceId, r])
	);
	let resourceDraft = $state<Omit<Resource, 'resourceId'>>({});
	let resourceDraftError = $state('');
	let activeAnnotation = $state<Annotation | null>(null);

	// TODO: Open the dialog after the user hovers over a highlighted annotation for 1 second.
	// TODO: Position the dialog as a popover adjacent to its respective, highlighted annotation.
	// TODO: Add a new button to the dialog that allows the user to create a new resource. This triggers a new form element to appear where the user can submit a new resource or cancel their resource draft.
	// TODO: Manage state history and support undo/redo for annotations.

	onMount(() => {
		// Add selection change listener.
		document.addEventListener('selectionchange', handleSelectionChange);

		// Watch dialog open state to disable/enable scroll
		const observer = new MutationObserver(() => {
			if (isModalOpen) {
				document.documentElement.style.overflow = 'hidden';
				document.body.style.overflow = 'hidden';
			} else {
				document.documentElement.style.overflow = '';
				document.body.style.overflow = '';
			}
		});
		if (isModalOpen) {
			observer.observe(document.documentElement, { attributes: true, attributeFilter: ['open'] });
		}

		onDestroy(() => {
			observer.disconnect();
			document.documentElement.style.overflow = '';
			document.body.style.overflow = '';
		});
	});

	$effect(() => {
		const highlight = new Highlight();
		annotations.forEach((annotation) => {
			const range = new Range();
			range.setStart(textContainerElement!.firstChild!, annotation.start);
			range.setEnd(textContainerElement!.firstChild!, annotation.end);
			annotatedRanges.set(annotation.annotationId, range);
			highlight.add(range);
		});

		CSS.highlights.set(highlightKey, highlight);
	});

	function handleSelectResource(
		annotation: Annotation,
		event: Event & { currentTarget: EventTarget & HTMLSelectElement }
	) {
		const resourceId = event.currentTarget.value;
		if (!resourceId) {
			return;
		}

		// Create a new annotation object with the updated reference.
		const updatedAnnotation: Annotation = {
			...annotation,
			reference: resourceId
		};

		// Update both the annotations map and selectedAnnotations set.
		annotations.set(annotation.annotationId, updatedAnnotation);

		// Replace the old annotation with the updated one in selectedAnnotations.
		selectedAnnotations.delete(annotation);
		selectedAnnotations.add(updatedAnnotation);
	}

	async function handleHighlight() {
		const selection = window.getSelection();
		if (!isValidSelection(selection)) {
			alert('Please select some text before highlighting.');
			return;
		}

		const range = selection!.getRangeAt(0);
		const annotationId = crypto.randomUUID();
		const substring = textContent.slice(range.startOffset, range.endOffset);
		const searchResponse = await semanticSearch.search(substring);
		const processedSearchResponse = processSearchResponse(searchResponse);
		annotations.set(annotationId, {
			annotationId,
			start: range.startOffset,
			end: range.endOffset,
			predictions: processedSearchResponse.predictions
		});

		// Update resources with new predictions.
		processedSearchResponse.resources.forEach((resource) => {
			resources.set(resource.resourceId, resource);
		});

		// Clear the selection after highlighting.
		selection!.removeAllRanges();
		isSelecting = false;
	}

	function isValidSelection(selection: Selection | null): boolean {
		if (!selection || selection.rangeCount === 0) {
			return false;
		}

		const range = selection.getRangeAt(0);
		return !!(
			textContainerElement &&
			textContainerElement.contains(range.startContainer) &&
			textContainerElement.contains(range.endContainer) &&
			range.startOffset !== range.endOffset
		);
	}

	function handleSelectionChange() {
		isSelecting = isValidSelection(window.getSelection());
	}

	function handleTextClick(event: MouseEvent) {
		if (!textContainerElement || isGenerating || isSelecting) {
			return;
		}

		const selection = getSelection();
		if (!selection) {
			return;
		}

		// Get the caret position from the click.
		caretRange = getCaretRange(event.clientX, event.clientY);
		if (!caretRange) {
			return;
		}

		selectedAnnotations.clear();
		intersection(Array.from(annotations.values()), caretRange).forEach((annotation) => {
			selectedAnnotations.add(annotation);
		});
		if (selectedAnnotations.size === 0) {
			// No annotations at the caret position, so close the modal.
			closeModal();
			return;
		}

		// Open the modal.
		openModal();
		return;
	}

	function handleTextKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			// TODO: Add current selection to highlights.
			console.log('Click highlighted text.');
		}
	}

	function handleDismissAnnotation(annotationId: string) {
		annotations.delete(annotationId);
		closeModal();
	}

	function openModal() {
		isModalOpen = true;
	}
	function closeModal() {
		caretRange = null;
		isModalOpen = false;
	}

	function handleAddResource(annotation: Annotation) {
		isEditingResource = true;
		resourceDraft = { label: '', description: '', emoji: '' };
		resourceDraftError = '';
		activeAnnotation = annotation;
	}

	function handleCancelResourceDraft() {
		isEditingResource = false;
		resourceDraft = { label: '', description: '', emoji: '' };
		resourceDraftError = '';
		activeAnnotation = null;
	}

	function handleSubmitResourceDraft() {
		if (!resourceDraft.label?.trim()) {
			resourceDraftError = 'Label is required.';
			return;
		}

		const resourceId = crypto.randomUUID();
		const newResource: Resource = {
			resourceId,
			label: resourceDraft.label?.trim(),
			description: resourceDraft.description?.trim(),
			emoji: resourceDraft.emoji?.trim()
		};

		resources.set(resourceId, newResource);
		if (activeAnnotation) {
			const updatedAnnotation: Annotation = {
				...activeAnnotation,
				reference: resourceId
			};
			annotations.set(activeAnnotation.annotationId, updatedAnnotation);

			// Remove any annotation with the same annotationId before adding the updated one.
			selectedAnnotations.forEach((a) => {
				if (a.annotationId === updatedAnnotation.annotationId) {
					selectedAnnotations.delete(a);
				}
			});

			selectedAnnotations.add(updatedAnnotation);
		}

		handleCancelResourceDraft();
	}
</script>

<div
	bind:this={textContainerElement}
	class="highlightable-text mx-auto my-8 min-h-[3rem] max-w-2xl rounded-xl border border-gray-200 bg-white px-8 py-6 text-center text-xl font-medium shadow-md"
	onclick={handleTextClick}
	role="textbox"
	tabindex="0"
	onkeydown={handleTextKeyDown}
>
	{textContent}
</div>

<button
	type="button"
	onclick={handleHighlight}
	class="mt-2 rounded-lg bg-green-700 px-5 py-2 text-lg font-semibold text-white shadow transition hover:bg-green-800"
	class:hidden={!isSelecting}
>
	Highlight
</button>

<div class="flex flex-col items-center justify-center py-8" class:hidden={!isGenerating}>
	<div
		class="mb-3 h-8 w-8 animate-spin rounded-full border-t-4 border-solid border-green-700"
	></div>
	<span class="text-lg text-gray-600">Loading annotations&hellip;</span>
</div>

{#if isModalOpen && selectedAnnotations.size > 0}
	<div class="fixed inset-0 z-10 flex items-center justify-center">
		<div
			class="fixed inset-0 bg-gray-500/75 transition-opacity"
			aria-hidden="true"
			onclick={closeModal}
		></div>
		<div
			class="relative z-20 flex min-h-full w-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
		>
			<div
				class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
			>
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<button
						type="button"
						class="absolute top-2 right-2 text-2xl font-bold text-gray-400 hover:text-gray-600"
						aria-label="Close"
						onclick={closeModal}>&times;</button
					>
					{#each selectedAnnotations as annotation (annotation.annotationId)}
						{@const substring = textContent.slice(annotation.start, annotation.end)}
						{@const predictions = annotation.predictions?.toSorted(
							(a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
						)}
						{@const selectedResource = annotation.reference
							? resources.get(annotation.reference)
							: undefined}
						<div class="annotation-metadata">
							<p class="annotation-substring">{substring}</p>
							{#if selectedResource}
								<ResourceCard resource={selectedResource} />
							{:else}
								<p class="resource-label">No resource associated</p>
							{/if}
							{#if predictions && predictions.length > 0}
								<select
									name={`select-resource-${annotation.annotationId}`}
									value={annotation.reference}
									onchange={(event) => handleSelectResource(annotation, event)}
								>
									<option value="">Select a resource</option>
									{#each predictions as prediction (prediction.resourceId)}
										{@const predictedResource = resources.get(prediction.resourceId)}
										<option value={prediction.resourceId}>
											{predictedResource?.label ?? 'Unlabeled resource'}
											{#if prediction.confidence !== undefined}
												{@const confidence = (prediction.confidence * 100).toFixed(2)}
												({confidence}%){/if}
										</option>
									{/each}
								</select>
							{/if}
							{#if isEditingResource && activeAnnotation?.annotationId === annotation.annotationId}
								<div class="resource-dialog">
									<input
										type="text"
										class="resource-label-input"
										placeholder="Resource label"
										bind:value={resourceDraft.label}
									/>
									<textarea
										class="resource-description-input"
										placeholder="Resource description"
										bind:value={resourceDraft.description}
									></textarea>
									<input
										type="text"
										maxlength="2"
										class="resource-label-input"
										placeholder="Emoji (optional)"
										bind:value={resourceDraft.emoji}
									/>
									{#if resourceDraftError}
										<p style="color: #c00; font-size: 13px; margin: 0 0 8px 0;">
											{resourceDraftError}
										</p>
									{/if}
									<div class="resource-dialog-actions">
										<button type="button" class="btn-primary" onclick={handleSubmitResourceDraft}
											>Submit</button
										>
										<button type="button" class="btn-secondary" onclick={handleCancelResourceDraft}
											>Cancel</button
										>
									</div>
								</div>
							{:else}
								<button
									type="button"
									class="btn-add-resource"
									onclick={() => handleAddResource(annotation)}
								>
									Create resource
								</button>
							{/if}
							<button
								type="button"
								class="btn-secondary mt-2"
								onclick={() => handleDismissAnnotation(annotation.annotationId)}
							>
								Remove
							</button>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	::highlight(custom-highlight) {
		background: rgba(255, 255, 0, 0.5);
	}

	.highlightable-text {
		white-space: pre-wrap;
		outline: none;
	}

	.annotations-dialog {
		border: 1px solid #ccc;
		border-radius: 8px;
		max-width: 400px;
		background: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.annotation-metadata {
		background: #f8f9fa;
		border: 1px solid #e9ecef;
		border-radius: 6px;
		padding: 16px;
		transition: all 0.2s ease;
	}

	.annotation-metadata:hover {
		background: #f1f3f4;
		border-color: #dee2e6;
	}

	.annotation-substring {
		font-weight: 600;
		color: #2c3e50;
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		padding: 8px 12px;
		margin: 0 0 12px 0;
		font-size: 14px;
		line-height: 1.4;
	}

	.resource-label {
		color: #6c757d;
		font-size: 13px;
		margin: 0 0 12px 0;
		font-weight: 500;
	}

	.annotation-metadata select {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #ced4da;
		border-radius: 4px;
		background: white;
		font-size: 14px;
		margin-bottom: 12px;
		transition: border-color 0.2s ease;
	}

	.annotation-metadata select:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	.annotations-dialog > button:last-child {
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 10px 20px;
		font-size: 14px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		width: 100%;
		margin-top: 8px;
	}

	.annotations-dialog > button:last-child:hover {
		background: #5a6268;
	}

	.spinner-container {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 1em;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 4px solid #ccc;
		border-top: 4px solid #333;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}

	.resource-dialog {
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 20px;
		max-width: 400px;
		background: white;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.resource-label-input,
	.resource-description-input {
		width: 100%;
		width: -moz-available; /* WebKit-based browsers will ignore this. */
		width: -webkit-fill-available; /* Mozilla-based browsers will ignore this. */
		width: stretch;
	}

	.resource-label-input {
		padding: 12px 16px;
		border: 1px solid #e1e8ed;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 500;
		margin-bottom: 1em;
		background: #f8f9fa;
		transition: all 0.2s ease;
	}

	.resource-label-input:focus {
		outline: none;
		border-color: #007bff;
		background: white;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.resource-description-input {
		padding: 12px 16px;
		border: 1px solid #e1e8ed;
		border-radius: 6px;
		font-size: 14px;
		margin-bottom: 1.5em;
		resize: vertical;
		min-height: 80px;
		transition: border-color 0.2s ease;
	}

	.resource-description-input:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.resource-dialog-actions {
		display: flex;
		gap: 0.75em;
	}

	.btn-primary {
		background: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
		flex: 1;
	}

	.btn-primary:hover {
		background: #0056b3;
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
		flex: 1;
	}

	.btn-secondary:hover {
		background: #5a6268;
	}

	.btn-add-resource {
		background: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.btn-add-resource:hover {
		background: #0056b3;
	}

	.dialog-close-btn {
		position: absolute;
		top: 0px;
		right: 0px;
		background: transparent;
		border: none;
		font-size: 1.5em;
		color: #888;
		cursor: pointer;
		z-index: 10;
		transition: color 0.2s;
	}

	.dialog-close-btn:hover {
		color: #333;
	}
</style>
