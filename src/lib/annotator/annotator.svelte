<script lang="ts">
	let text = $state<string | null>(null);

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer === null || event.dataTransfer.files.length === 0) {
			return;
		}

		const file = event.dataTransfer.files[0];
		const fileContent = await file.text();
		text = fileContent;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	async function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files === null || target.files.length === 0) {
			return;
		}

		const file = target.files[0];
		const fileContent = await file.text();
		text = fileContent;
	}
</script>

<div role="region" ondrop={handleDrop} ondragover={handleDragOver}>
	<input type="file" onchange={handleInput} />

	{#if text !== null}
		<p>{text}</p>
	{/if}
</div>
