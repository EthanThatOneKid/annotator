<script lang="ts">
	import { onMount } from 'svelte';
	import type { AnnotatorService } from './services/service';
	import type { Annotation } from './annotation';
	import { toRange } from './annotation';
	import { getCaretRange } from './caret';

	let props: {
		text?: string;
		service: AnnotatorService;
	} = $props();

	let text = $state<string | null>(props.text ?? null);
	let textContainerElement: HTMLDivElement | null = $state(null);
	let highlight = $state<Highlight | null>(null);
	let selectedRange: AbstractRange | null = $state(null);
	let isGenerating = $state(false);
	let selectedAnnotation = $state<Annotation | null>(null);
	let annotations = $state<Annotation[]>([]);

	onMount(async () => {
		highlight = new Highlight();
		if (text !== null) {
			await predict(text);
		}
	});

	async function predict(currentText: string) {
		isGenerating = true;
		const predictResponse = await props.service.predict(currentText);
		console.log({ predictResponse });
		annotations = predictResponse.annotations;
		isGenerating = false;
		text = currentText;

		setTimeout(() => {
			const textNode = textContainerElement!.firstChild;
			if (textNode && textNode.nodeType === Node.TEXT_NODE) {
				for (const annotation of annotations) {
					highlight!.add(toRange(textNode, annotation));
				}

				CSS.highlights.set('custom-highlight', highlight!);
			}
		});
	}

	function addAnnotation(annotation: Annotation) {
		annotations.push(annotation);
		highlight!.add(toRange(textContainerElement!.firstChild!, annotation));
		CSS.highlights.set('custom-highlight', highlight!);
	}

	function removeAnnotation() {
		annotations = annotations.filter((a) => a.annotationId !== selectedAnnotation!.annotationId);
		highlight!.delete(selectedRange!);
		CSS.highlights.set('custom-highlight', highlight!);
	}

	async function handleFormSubmit(event: Event) {
		event.preventDefault();
		highlight!.clear();

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const currentText = formData.get('text');
		if (typeof currentText !== 'string') {
			throw new Error();
		}

		await predict(currentText);
	}

	function handleHighlight() {
		if (!textContainerElement) {
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

		addAnnotation({
			annotationId: crypto.randomUUID(),
			rangeStart: range.startOffset,
			rangeEnd: range.endOffset
		});
	}

	function handleTextClick(event: MouseEvent) {
		if (!textContainerElement) {
			return;
		}

		const selection = getSelection();
		if (!selection) {
			return;
		}

		// Get the caret position from the click.
		const caretRange = getCaretRange(event.clientX, event.clientY);
		if (!caretRange) {
			return;
		}

		// Check all highlights for a match.
		for (const r of highlight!) {
			if (
				r.startContainer === caretRange.startContainer &&
				r.startOffset <= caretRange.startOffset &&
				r.endContainer === caretRange.endContainer &&
				r.endOffset >= caretRange.endOffset
			) {
				selectedRange = r;
				// Try to find the corresponding annotation
				if (
					textContainerElement &&
					textContainerElement.firstChild &&
					textContainerElement.firstChild.nodeType === Node.TEXT_NODE &&
					Array.isArray(annotations)
				) {
					selectedAnnotation =
						annotations.find((a) => a.rangeStart === r.startOffset && a.rangeEnd === r.endOffset) ||
						null;
				} else {
					selectedAnnotation = null;
				}

				const dialog = document.getElementById('metadata-dialog') as HTMLDialogElement;
				dialog?.showModal();
				return;
			}
		}
	}

	function handleTextKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			// TODO: Add current selection to highlights.
			console.log('Click highlighted text.');
		}
	}

	function handleDeleteHighlight() {
		removeAnnotation();
		closeDeleteDialog();
	}

	function closeDeleteDialog() {
		selectedRange = null;
		selectedAnnotation = null;
		const dialog = document.getElementById('metadata-dialog') as HTMLDialogElement;
		dialog?.close();
	}

	function handleGoBack() {
		text = null;
		highlight?.clear();
		CSS.highlights.delete('custom-highlight');
		annotations = [];
	}
</script>

{#if text !== null}
	<div>
		<div
			bind:this={textContainerElement}
			class="highlightable-text"
			onclick={handleTextClick}
			role="textbox"
			tabindex="0"
			onkeydown={handleTextKeyDown}
		>
			{text}
		</div>
		<button type="button" onclick={handleHighlight}>Highlight</button>
		<button type="button" onclick={handleGoBack}>Go back</button>
	</div>
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

{#if isGenerating}
	<div class="spinner-container">
		<div class="spinner"></div>
		<span>Loading annotations...</span>
	</div>
{/if}

<dialog id="metadata-dialog" class="delete-dialog">
	<h2>Annotation Metadata</h2>
	{#if selectedRange}
		<p>Highlighted text: <strong>{selectedRange.toString()}</strong></p>
		{#if selectedAnnotation}
			<p>Annotation ID: <strong>{selectedAnnotation.annotationId}</strong></p>
			<p>Range Start: <strong>{selectedAnnotation.rangeStart}</strong></p>
			<p>Range End: <strong>{selectedAnnotation.rangeEnd}</strong></p>
		{/if}
	{/if}
	<div class="dialog-buttons">
		<button type="button" onclick={handleDeleteHighlight}>Delete</button>
		<button type="button" onclick={closeDeleteDialog}>Close</button>
	</div>
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

	.delete-dialog {
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 20px;
		max-width: 400px;
	}

	.delete-dialog h2 {
		margin-top: 0;
		margin-bottom: 16px;
	}

	.delete-dialog p {
		margin-bottom: 20px;
	}

	.dialog-buttons {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	.dialog-buttons button {
		padding: 8px 16px;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
	}

	.dialog-buttons button:first-child {
		background-color: #dc3545;
		color: white;
		border-color: #dc3545;
	}

	.dialog-buttons button:first-child:hover {
		background-color: #c82333;
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
