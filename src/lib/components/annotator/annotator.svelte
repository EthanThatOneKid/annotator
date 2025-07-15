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
	let caretRange = $state<Range | null>(null);
	let dialogElement = $state<HTMLDialogElement | null>(null);
	let textContainerElement = $state<HTMLDivElement | null>(null);
	let selectedAnnotationId = $state<string | null>(null);
	let selectedAnnotations = $state(new Set<Annotation>());
	let annotatedRanges = $state(new Map<string, Range>());
	let annotations = $state(
		new Map<string, Annotation>(generated.annotations.map((a) => [a.annotationId, a]))
	);
	let resources = $state(
		new Map<string, Resource>(generated.resources.map((r) => [r.resourceId, r]))
	);

	let resourceDialogElement: HTMLDialogElement | null = null;

	// Resource dialog is opened from within annotation dialog.
	function openResourceDialog(annotationId: string) {
		selectedAnnotationId = annotationId;
		resourceDialogElement?.showModal();
	}

	function closeResourceDialog() {
		selectedAnnotationId = null;
		resourceDialogElement?.close();
	}

	function handleResourceFormSubmit(event: Event) {
		event.preventDefault();
		if (selectedAnnotationId === null) {
			return;
		}

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const resourceLabel = formData.get('label') as string;
		const resourceDescription = formData.get('description') as string;
		const resourceId = crypto.randomUUID();
		resources.set(resourceId, {
			resourceId,
			resourceLabel,
			resourceDescription
		});

		const annotation = annotations.get(selectedAnnotationId)!;
		annotations.set(selectedAnnotationId, { ...annotation, resourceId });

		closeResourceDialog();

		// TODO: Make sure logical dialog appears next.
	}

	// TODO: Open the dialog after the user hovers over a highlighted annotation for 1 second.
	// TODO: Add a new button to the dialog that allows the user to create a new resource. This triggers a new form element to appear where the user can submit a new resource or cancel their resource draft.
	// TODO: Manage state history and support undo/redo for annotations.

	onMount(async () => {
		// Add selection change listener.
		document.addEventListener('selectionchange', handleSelectionChange);
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

	function handleSelectResource(annotation: Annotation, event: Event) {
		const resourceId = (event.target as HTMLSelectElement).value;
		if (!resourceId) {
			return;
		}

		// Update the annotation with the selected resource.
		annotation.resourceId = resourceId;
		annotations.set(annotation.annotationId, annotation);
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
		const response = await service.predict(substring);
		annotations.set(annotationId, {
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
		annotations.delete(annotationId);
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

<dialog class="annotations-dialog" bind:this={dialogElement} closedby="any">
	<button type="button" class="dialog-close-btn" aria-label="Close" onclick={() => closeDialog()}
		>&times;</button
	>
	{#each selectedAnnotations as annotation (annotation.annotationId)}
		{@const substring = textContent.slice(annotation.start, annotation.end)}
		{@const predictions = (annotation.predictions ?? []).toSorted(
			(a, b) => b.confidence - a.confidence
		)}
		{@const selectedResource = annotation.resourceId
			? resources.get(annotation.resourceId)
			: undefined}
		<div class="annotation-metadata">
			<p class="annotation-substring">{substring}</p>

			<!-- TODO: Render resource preview card. -->
			<!-- {#if selectedResource}
					<p class="resource-label">
						Selected: {selectedResource.resourceLabel ?? 'Unlabeled resource'}
					</p>
				{:else}
					<p class="resource-label">No resource selected</p>
				{/if} -->

			<!-- TODO: Search for other resources.  -->
			<select
				value={annotation.resourceId}
				onchange={(event) => handleSelectResource(annotation, event)}
			>
				<option value="">Choose a resource</option>

				<hr />

				<optgroup label="Predictions">
					{#each predictions as prediction (prediction.resourceId)}
						{@const predictedResource = resources.get(prediction.resourceId)}
						<option value={prediction.resourceId}>
							{predictedResource?.resourceLabel ?? 'Unlabeled resource'} ({(
								prediction.confidence * 100
							).toFixed(2)}%)
						</option>
					{:else}
						<option value="" disabled>No resources found</option>
					{/each}
				</optgroup>

				<optgroup label="User defined resources"></optgroup>
			</select>

			<button
				type="button"
				onclick={() => openResourceDialog(annotation.annotationId)}
				class="btn-add-resource btn-primary">&plus; Resource</button
			>
			<button
				type="button"
				class="btn-secondary"
				onclick={() => handleDismissAnnotation(annotation.annotationId)}>Dismiss</button
			>
		</div>
	{/each}
</dialog>

<dialog class="resource-dialog" bind:this={resourceDialogElement} closedby="any">
	<button type="button" class="dialog-close-btn" aria-label="Close" onclick={closeResourceDialog}
		>&times;</button
	>
	<form onsubmit={handleResourceFormSubmit}>
		<input
			type="text"
			name="label"
			placeholder="Enter resource name..."
			required
			class="resource-label-input"
		/>
		<textarea
			name="description"
			placeholder="Add a description (optional)"
			rows="3"
			class="resource-description-input"
		></textarea>
		<div class="resource-dialog-actions">
			<button type="submit" class="btn-primary">Save</button>
			<button type="button" onclick={closeResourceDialog} class="btn-secondary">Cancel</button>
		</div>
	</form>
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

	.annotations-dialog {
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
