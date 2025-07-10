<script lang="ts">
	import { onMount } from 'svelte';

	let text = $state<string | null>(null);
	let textContainerElement: HTMLDivElement | null = $state(null);
	let highlight = $state<Highlight | null>(null);

	onMount(() => {
		highlight = new Highlight();
	});

	function handleFormSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		text = formData.get('text') as string;
	}

	function handleHighlight() {
		if (!textContainerElement) {
			return;
		}

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) {
			return;
		}

		const range = selection.getRangeAt(0);
		if (
			!textContainerElement.contains(range.startContainer) ||
			!textContainerElement.contains(range.endContainer)
		) {
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

		// Get the caret position from the click
		const range = document.caretRangeFromPoint
			? document.caretRangeFromPoint(event.clientX, event.clientY)
			: (function () {
					const pos = document.caretPositionFromPoint?.(event.clientX, event.clientY);
					if (pos) {
						const r = document.createRange();
						r.setStart(pos.offsetNode, pos.offset);
						r.collapse(true);
						return r;
					}
					return null;
				})();
		if (!range) {
			return;
		}

		// Check all highlights for a match.
		for (const r of highlight!) {
			if (
				r.startContainer === range.startContainer &&
				r.startOffset <= range.startOffset &&
				r.endContainer === range.endContainer &&
				r.endOffset >= range.endOffset
			) {
				if (confirm('Delete this highlight?')) {
					highlight!.delete(r);
					CSS.highlights.set('custom-highlight', highlight!);
				}

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

<style>
	::highlight(custom-highlight) {
		background: yellow;
		cursor: pointer; /* This doesn't do anything AFAICT. */
	}

	.highlightable-text {
		white-space: pre-wrap;
		outline: none;
	}
</style>
