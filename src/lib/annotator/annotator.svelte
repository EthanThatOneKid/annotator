<script lang="ts">
	import { onMount } from 'svelte';
	import type { Annotation } from './annotation';
	import { toRange } from './annotation';
	import { getCaretRange } from './caret';

	let props: {
		generateAnnotations: (text: string) => Annotation[] | Promise<Annotation[]>;
	} = $props();

	let text = $state<string | null>(null);
	let textContainerElement: HTMLDivElement | null = $state(null);
	let highlight = $state<Highlight | null>(null);
	let showDialog = $state(false);
	let selectedRange: AbstractRange | null = $state(null);

	onMount(() => {
		highlight = new Highlight();
	});

	async function handleFormSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		text = formData.get('text') as string;
		highlight!.clear();
		for (const annotation of await props.generateAnnotations(text)) {
			highlight!.add(toRange(textContainerElement!, annotation));
		}
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

		highlight!.add(range);
		CSS.highlights.set('custom-highlight', highlight!);
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
				showDialog = true;
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

	function deleteHighlight() {
		if (selectedRange && highlight) {
			highlight.delete(selectedRange);
			CSS.highlights.set('custom-highlight', highlight);
		}

		closeDeleteDialog();
	}

	function closeDeleteDialog() {
		showDialog = false;
		selectedRange = null;
		const dialog = document.getElementById('metadata-dialog') as HTMLDialogElement;
		dialog?.close();
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

<dialog id="metadata-dialog" class="delete-dialog">
	<h2>Highlight Metadata</h2>
	{#if selectedRange}
		<p>Highlighted text: <strong>{selectedRange.toString()}</strong></p>
	{/if}
	<div class="dialog-buttons">
		<button type="button" onclick={deleteHighlight}>Delete</button>
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
</style>
