<script lang="ts">
	import { onMount } from 'svelte';
	import type { Annotation, Resource } from './annotation';
	import { intersection } from './annotation';
	import { getCaretRange } from './caret';

	const HIGHLIGHT_KEY = 'custom-highlight';

	let props: {
		text: string;
		annotations: Annotation[];
		resources: Resource[];
	} = $props();

	let isGenerating = $state(false);
	let textContainerElement = $state<HTMLDivElement | null>(null);
	let dialogElement = $state<HTMLDialogElement | null>(null);
	let highlight = $state<Highlight | null>(null);
	let caretRange = $state<Range | null>(null);
	let annotations = $state<Annotation[]>(props.annotations);
	let resources = $state<Resource[]>(props.resources);
	let ranges = $state<Map<string, Range>>(new Map());
	let selectedAnnotations = $state<Annotation[]>([]);

	onMount(async () => {
		highlight = new Highlight();
		for (const annotation of annotations) {
			const range = new Range();
			range.setStart(textContainerElement!.firstChild!, annotation.start);
			range.setEnd(textContainerElement!.firstChild!, annotation.end);
			ranges.set(annotation.annotationId, range);
			highlight!.add(range);
		}

		CSS.highlights.set(HIGHLIGHT_KEY, highlight!);
	});

	function addAnnotation(annotation: Annotation) {
		const range = new Range();
		range.setStart(textContainerElement!.firstChild!, annotation.start);
		range.setEnd(textContainerElement!.firstChild!, annotation.end);
		ranges.set(annotation.annotationId, range);
		annotations.push(annotation);
		highlight!.add(range);
		CSS.highlights.set(HIGHLIGHT_KEY, highlight!);
	}

	function removeAnnotation(annotationId: string) {
		const { removed, remaining } = Object.groupBy(annotations, (a) =>
			a.annotationId === annotationId ? 'removed' : 'remaining'
		);
		if (!removed || removed.length === 0) {
			return;
		}

		annotations = remaining ?? [];
		removed.forEach((a) => {
			highlight!.delete(ranges.get(a.annotationId)!);
			ranges.delete(a.annotationId);
		});

		CSS.highlights.set(HIGHLIGHT_KEY, highlight!);
	}

	function handleHighlight() {
		if (!textContainerElement || isGenerating) {
			return;
		}

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) {
			alert('Please select some text before highlighting.');
			return;
		}

		const range = selection.getRangeAt(0);
		if (
			!textContainerElement.contains(range.startContainer) ||
			!textContainerElement.contains(range.endContainer)
		) {
			alert('Please select from the featured text.');
			return;
		}

		const annotationId = crypto.randomUUID();
		addAnnotation({
			annotationId,
			start: range.startOffset,
			end: range.endOffset
		});
	}

	function handleTextClick(event: MouseEvent) {
		if (!textContainerElement || isGenerating) {
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

		selectedAnnotations = intersection(annotations, caretRange);
		if (selectedAnnotations.length === 0) {
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
	{props.text}
</div>
<button type="button" onclick={handleHighlight}>Highlight</button>

{#if isGenerating}
	<div class="spinner-container">
		<div class="spinner"></div>
		<span>Loading annotations...</span>
	</div>
{/if}

<dialog id="metadata-dialog" class="metadata-dialog" bind:this={dialogElement}>
	{#each selectedAnnotations as annotation (annotation.annotationId)}
		<div class="annotation-metadata">
			<ul>
				<li>Annotation ID: <strong>{annotation.annotationId}</strong></li>
				<li>
					Range: <strong>{annotation.start}</strong>&mdash;<strong>{annotation.end}</strong>
				</li>
				<li>Text: <strong>{props.text.slice(annotation.start, annotation.end)}</strong></li>
			</ul>
			<button type="button" onclick={() => handleDismissAnnotation(annotation.annotationId)}
				>Dismiss</button
			>
		</div>
	{/each}

	<button type="button" onclick={() => closeDialog()}>Close</button>
</dialog>

<style>
	::highlight(custom-highlight) {
		background: yellow;
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
