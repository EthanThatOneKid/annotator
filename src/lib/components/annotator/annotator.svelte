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
		textContent: string;
		generated: AnnotateResponse;
		service: AnnotatorService;
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
		annotatedRanges.set(annotation.annotationId, range);
		annotations.set(annotation.annotationId, annotation);
		highlight!.add(range);
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
			if (resources.has(resource.resourceId)) {
				return;
			}

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
		<div class="annotation-metadata">
			<ul>
				<li>Annotation ID: <strong>{annotation.annotationId}</strong></li>
				<li>
					Range: <strong>{annotation.start}</strong>..<strong>{annotation.end}</strong>
				</li>
				<li>Text: <strong>{textContent.slice(annotation.start, annotation.end)}</strong></li>
			</ul>
			<select value={annotation.resourceId}>
				{#each annotation.predictions ?? [] as prediction (prediction.resourceId)}
					{@const resource = resources.get(prediction.resourceId)}
					{#if resource}
						<option value={prediction.resourceId}>
							{resource.resourceLabel ?? 'Unlabeled resource'} ({(
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
