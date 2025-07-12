<script lang="ts">
	import { CompromiseService } from '$lib/annotator/services/compromise';
	import Annotator from '$lib/annotator/annotator.svelte';

	let text = $state<string | null>(null);

	const service = new CompromiseService();

	async function handleFormSubmit(event: Event) {
		event.preventDefault();

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const currentText = formData.get('text');
		if (typeof currentText !== 'string') {
			throw new Error();
		}

		text = currentText;
	}

	function handleGoBack() {
		text = null;
	}
</script>

{#if text !== null}
	<Annotator {service} {text} />
	<button type="button" onclick={handleGoBack}>Go back</button>
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
