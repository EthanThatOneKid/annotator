<script lang="ts">
	let text = $state<string | null>(null);
	let textContainerElement: HTMLDivElement | null = $state(null);

	function handleFormSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		text = formData.get('text') as string;
	}

	function handleHighlight() {
		if (!textContainerElement) return;
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);
		if (
			!textContainerElement.contains(range.startContainer) ||
			!textContainerElement.contains(range.endContainer)
		) {
			return;
		}

		const highlight = new Highlight(range);
		CSS.highlights.set('user-highlight', highlight);
	}
</script>

{#if text !== null}
	<div>
		<div bind:this={textContainerElement} class="highlightable-text">
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
	::highlight(user-highlight) {
		background: yellow;
	}

	.highlightable-text {
		white-space: pre-wrap;
		outline: none;
	}
</style>
