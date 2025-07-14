<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		Annotation,
		Resource,
		AnnotatorService,
		AnnotateResponse
	} from '$lib/services/annotator/annotator';
	import { intersection } from '$lib/services/annotator/annotator';
	import { getCaretRange } from './caret';

	let {
		textContent,
		generated,
		service,
		highlightKey = 'custom-highlight'
	}: {
		service: AnnotatorService;
		generated: AnnotateResponse;
		textContent: string;
		highlightKey?: string;
	} = $props();

	let isGenerating = $state(false);
	let isSelecting = $state(false);
	let highlight = $state<Highlight | null>(null);
	let caretRange = $state<Range | null>(null);
	let dialogElement = $state<HTMLDialogElement | null>(null);
	let textContainerElement = $state<HTMLDivElement | null>(null);
	let annotatedRanges = $state(new Map<string, Range>());
	let selectedAnnotations = $state(new Set<Annotation>());
	let annotations = $state(
		new Map<string, Annotation>(generated.annotations.map((a) => [a.annotationId, a]))
	);
	let resources = $state(
		new Map<string, Resource>(generated.resources.map((r) => [r.resourceId, r]))
	);

	onMount(async () => {
		// TODO: Move into $effect, or $derive from annotations.
		highlight = new Highlight();
		annotations.forEach((annotation) => {
			const range = new Range();
			range.setStart(textContainerElement!.firstChild!, annotation.start);
			range.setEnd(textContainerElement!.firstChild!, annotation.end);
			annotatedRanges.set(annotation.annotationId, range);
			highlight!.add(range);
		});

		CSS.highlights.set(highlightKey, highlight!);

		// Add selection change listener.
		document.addEventListener('selectionchange', handleSelectionChange);
	});

	function addAnnotation(annotation: Annotation) {
		const range = new Range();
		range.setStart(textContainerElement!.firstChild!, annotation.start);
		range.setEnd(textContainerElement!.firstChild!, annotation.end);

		highlight!.add(range);
		annotatedRanges.set(annotation.annotationId, range);
		annotations.set(annotation.annotationId, annotation);

		CSS.highlights.set(highlightKey, highlight!);
	}

	function removeAnnotation(annotationId: string) {
		const range = annotatedRanges.get(annotationId);
		if (!range) {
			return;
		}

		highlight!.delete(range);
		annotatedRanges.delete(annotationId);
		annotations.delete(annotationId);

		CSS.highlights.set(highlightKey, highlight!);
	}

	function handleSelectResource(annotation: Annotation, event: Event) {
		const resourceId = (event.target as HTMLSelectElement).value;
		if (!resourceId) {
			return;
		}

		// Update the annotation with the selected resource.
		annotation.resourceId = resourceId;
		annotations.set(annotation.annotationId, annotation);

		// TODO: Trigger state change.
		selectedAnnotations = new Set(selectedAnnotations);
	}

	async function handleHighlight() {
		const selection = window.getSelection();
		if (!isValidSelection(selection)) {
			alert('Please select some text before highlighting.');
			return;
		}

		const range = selection!.getRangeAt(0);
		const annotationId = crypto.randomUUID();

		const response = await service.predict(textContent.slice(range.startOffset, range.endOffset));
		addAnnotation({
			annotationId,
			start: range.startOffset,
			end: range.endOffset,
			predictions: response.predictions
		});

		// Update resources with new predictions.
		response.resources.forEach((resource) => {
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

		selectedAnnotations = new Set(intersection(Array.from(annotations.values()), caretRange));
		if (selectedAnnotations.size === 0) {
			// No annotations at the caret position, so close the dialog.
			closeDialog();
			return;
		}

		// Open the dialog.
		dialogElement?.showModal();
		return;
	}

	function handleTextKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			// TODO: Add current selection to highlights.
			console.log('Click highlighted text.');
		}
	}

	function handleDismissAnnotation(annotationId: string) {
		removeAnnotation(annotationId);
		closeDialog();
	}

	function closeDialog() {
		caretRange = null;
		dialogElement?.close();
	}
</script>

<div
	bind:this={textContainerElement}
	class="highlightable-text"
	onclick={handleTextClick}
	role="textbox"
	tabindex="0"
	onkeydown={handleTextKeyDown}
>
	{textContent}
</div>

{#if isSelecting}
	<button type="button" onclick={handleHighlight}>Highlight</button>
{/if}

{#if isGenerating}
	<div class="spinner-container">
		<div class="spinner"></div>
		<span>Loading annotations&hellip;</span>
	</div>
{/if}

<dialog id="metadata-dialog" class="metadata-dialog" bind:this={dialogElement} closedby="any">
	{#each selectedAnnotations as annotation (annotation.annotationId)}
		{@const substring = textContent.slice(annotation.start, annotation.end)}
		{@const selectedResource = annotation.resourceId
			? resources.get(annotation.resourceId)
			: undefined}
		<div class="annotation-metadata">
			<p class="annotation-substring">{substring}</p>

			{#if selectedResource}
				<!-- TODO: Render resource preview card. -->
				<p class="resource-label">
					Selected Resource: {selectedResource.resourceLabel ?? 'Unlabeled resource'}
				</p>
			{:else}
				<p class="resource-label">No resource selected</p>
			{/if}

			<select
				value={annotation.resourceId}
				onchange={(event) => handleSelectResource(annotation, event)}
			>
				{#each annotation.predictions ?? [] as prediction (prediction.resourceId)}
					{@const predictedResource = resources.get(prediction.resourceId)}
					{#if predictedResource}
						<option value={prediction.resourceId}>
							{predictedResource.resourceLabel ?? 'Unlabeled resource'} ({(
								prediction.confidence * 100
							).toFixed(2)}%)
						</option>
					{/if}
				{:else}
					<option value="" disabled>No predictions available</option>
				{/each}
			</select>

			<button type="button" onclick={() => handleDismissAnnotation(annotation.annotationId)}
				>Dismiss</button
			>
		</div>
	{/each}

	<button type="button" onclick={() => closeDialog()}>Close</button>
</dialog>

<style>
	::highlight(custom-highlight) {
		background: rgba(255, 255, 0, 0.5);
		cursor: pointer; /* This doesn't do anything AFAICT. */
	}

	.highlightable-text {
		white-space: pre-wrap;
		outline: none;
	}

	.metadata-dialog {
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 20px;
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
		margin-bottom: 16px;
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

	.annotation-metadata button {
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 8px 16px;
		font-size: 14px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.annotation-metadata button:hover {
		background: #c82333;
	}

	.metadata-dialog > button:last-child {
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

	.metadata-dialog > button:last-child:hover {
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
</style>
