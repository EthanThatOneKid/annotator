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
	let dialogElement = $state<HTMLDialogElement | null>(null);
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
		dialogElement?.showModal();
	}

	function closeModal() {
		caretRange = null;
		isModalOpen = false;
		dialogElement?.close();
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
	class="text-container"
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
	class="highlight-button"
	class:hidden={!isSelecting}
>
	Highlight
</button>

<div class="loading-container" class:hidden={!isGenerating}>
	<div class="spinner"></div>
	<span class="loading-text">Loading annotations&hellip;</span>
</div>

<dialog bind:this={dialogElement} id="annotation-dialog" class="dialog-overlay" closedby="any">
	<div class="dialog-backdrop" aria-hidden="true" onclick={closeModal}></div>
	<div class="dialog-container">
		<div class="dialog-content">
			<div class="dialog-body">
				<button type="button" class="dialog-close-button" aria-label="Close" onclick={closeModal}
					>&times;</button
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
											({confidence}%)
										{/if}
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
								onclick={() => handleAddResource(annotation)}>Create resource</button
							>
						{/if}
						<button
							type="button"
							class="btn-secondary"
							onclick={() => handleDismissAnnotation(annotation.annotationId)}>Remove</button
						>
					</div>
				{/each}
			</div>
		</div>
	</div>
</dialog>

<style>
	.text-container {
		margin: 2rem auto;
		min-height: 3rem;
		max-width: 42rem;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background-color: #ffffff;
		padding: 1.5rem 2rem;
		text-align: center;
		font-size: 1.25rem;
		font-weight: 500;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		white-space: pre-wrap;
		outline: none;
	}

	.highlight-button {
		margin-top: 0.5rem;
		border-radius: 0.5rem;
		background-color: #15803d;
		padding: 0.5rem 1.25rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #ffffff;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
		transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.highlight-button:hover {
		background-color: #166534;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 0;
	}

	.spinner {
		margin-bottom: 0.75rem;
		height: 2rem;
		width: 2rem;
		animation: spin 1s linear infinite;
		border-radius: 9999px;
		border-top-width: 4px;
		border-style: solid;
		border-color: #15803d;
	}

	.loading-text {
		font-size: 1.125rem;
		color: #4b5563;
	}

	.dialog-overlay {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dialog-backdrop {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		background-color: rgba(107, 114, 128, 0.75);
		transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.dialog-container {
		position: relative;
		z-index: 20;
		display: flex;
		min-height: 100%;
		width: 100%;
		align-items: flex-end;
		justify-content: center;
		padding: 1rem;
		text-align: center;
	}

	@media (min-width: 640px) {
		.dialog-container {
			align-items: center;
			padding: 0;
		}
	}

	.dialog-content {
		position: relative;
		transform: translate(0, 0) rotate(0) skewX(0) skewY(0) scaleX(1) scaleY(1);
		overflow: hidden;
		border-radius: 0.5rem;
		background-color: #ffffff;
		text-align: left;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@media (min-width: 640px) {
		.dialog-content {
			margin: 2rem 0;
			width: 100%;
			max-width: 32rem;
		}
	}

	.dialog-body {
		background-color: #ffffff;
		padding: 1.25rem 1rem 1rem;
	}

	@media (min-width: 640px) {
		.dialog-body {
			padding: 1.5rem 1.5rem 1rem;
		}
	}

	.dialog-close-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #9ca3af;
	}

	.dialog-close-button:hover {
		color: #4b5563;
	}

	::highlight(custom-highlight) {
		background: rgba(255, 255, 0, 0.5);
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
</style>
