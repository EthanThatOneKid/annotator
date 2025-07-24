<script lang="ts">
	import { page } from '$app/state';
	import type { AnnotateResponse } from '$lib/services/annotator/annotator';
	import { CompromiseAnnotator } from '$lib/services/annotator/compromise/compromise';
	import { MediawikiOpensearch } from '$lib/services/semantic-search/mediawiki-opensearch/mediawiki-opensearch';
	import Annotator from '$lib/components/annotator/annotator.svelte';

	let textContent = $state<string | null>(null);
	let generatedAnnotateResponse = $state<AnnotateResponse | null>(null);
	let isGenerating = $state(false);
	let isAnnotating = $state(false);

	$effect(() => {
		textContent ??= page.url.searchParams.get('t');
		if (!isAnnotating || textContent === null || isGenerating) {
			return;
		}

		isGenerating = true;
		isAnnotating = false;

		annotator
			.annotate(textContent)
			.then((response) => {
				generatedAnnotateResponse = response;
			})
			.finally(() => {
				isGenerating = false;
			});
	});

	// Trigger annotation when textContent changes.
	$effect(() => {
		if (textContent !== null) {
			isAnnotating = true;
		}
	});

	const semanticSearch = new MediawikiOpensearch();
	const annotator = new CompromiseAnnotator(semanticSearch);

	async function handleFormSubmit(event: Event & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();

		const form = event.currentTarget;
		const formData = new FormData(form);
		const currentText = formData.get('textContent');
		if (typeof currentText !== 'string') {
			throw new Error('Text content must be a string');
		}

		textContent = currentText;
		isAnnotating = true;

		const searchParams = new URLSearchParams(page.url.searchParams);
		searchParams.set('t', currentText);
		updateSearchParams(searchParams);
	}

	function handleGoBack() {
		textContent = null;
		generatedAnnotateResponse = null;
		isAnnotating = false;

		const updatedSearchParams = new URLSearchParams(page.url.searchParams);
		updatedSearchParams.delete('t');

		updateSearchParams(updatedSearchParams);
	}

	function updateSearchParams(searchParams: URLSearchParams) {
		const searchParamsString = searchParams.toString();
		history.pushState(
			null,
			'',
			`${location.pathname}${searchParamsString ? `?${searchParamsString}` : ''}${location.hash}`
		);
	}
</script>

<section class="hero-section">
	<div class="hero-content">
		<h1 class="hero-title">Annotator</h1>

		<p class="hero-subtitle">Highlight, annotate, and link resources to your text with ease.</p>

		{#if !isGenerating}
			{#if textContent !== null && generatedAnnotateResponse !== null}
				<div class="annotator-container">
					<Annotator bind:textContent generated={generatedAnnotateResponse} {semanticSearch} />

					<button type="button" onclick={handleGoBack} class="go-back-button">Go back</button>
				</div>
			{:else}
				<form onsubmit={handleFormSubmit} class="text-form">
					<textarea
						rows="5"
						cols="40"
						name="textContent"
						placeholder="Type or edit text here..."
						class="text-area">{textContent}</textarea
					>
					<button type="submit" class="submit-button">Submit</button>
				</form>
			{/if}
		{:else}
			<div class="loading-container">
				<div class="spinner"></div>
				<span class="loading-text">Loading annotations&hellip;</span>
			</div>
		{/if}
	</div>

	<!-- Scroll for more info -->
	<div class="scroll-indicator">
		<span class="scroll-text">Scroll for more info</span>
		<svg class="scroll-arrow" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
			><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg
		>
	</div>
</section>

<!-- Info Section -->
<section class="info-section">
	<div class="info-content">
		<h2 class="info-title">How it works</h2>
		<p class="info-text">
			Paste or type your text above, highlight entities or topics, and link them to resources. Use
			the annotation dialog to manage and create new resources. Perfect for research, study, or
			content enrichment.
		</p>
		<div class="features-grid">
			<div class="feature-card">
				<h3 class="feature-title">Smart Highlighting</h3>
				<p class="feature-text">
					Automatically detect and highlight key entities and topics in your text.
				</p>
			</div>
			<div class="feature-card">
				<h3 class="feature-title">Resource Linking</h3>
				<p class="feature-text">
					Associate highlights with resources, such as Wikipedia articles or your own notes.
				</p>
			</div>
			<div class="feature-card">
				<h3 class="feature-title">Easy Management</h3>
				<p class="feature-text">
					Edit, remove, or create new resources directly from the annotation dialog.
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	.hero-section {
		position: relative;
		display: flex;
		min-height: 100vh;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-image: linear-gradient(to bottom, #f0fdf4, #ffffff);
	}

	.hero-content {
		width: 100%;
		max-width: 42rem;
		border-radius: 0.75rem;
		background-color: #ffffff;
		padding: 2rem;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}

	.hero-title {
		margin-bottom: 1rem;
		text-align: center;
		font-size: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.025em;
		color: #166534;
	}

	.hero-subtitle {
		margin-bottom: 2rem;
		text-align: center;
		font-size: 1.25rem;
		color: #4b5563;
	}

	.annotator-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.go-back-button {
		margin-top: 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid #d1d5db;
		background-color: #f3f4f6;
		padding: 0.5rem 1.5rem;
		font-size: 1.125rem;
		font-weight: 500;
		transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.go-back-button:hover {
		background-color: #e5e7eb;
	}

	.text-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.text-area {
		resize: vertical;
		width: 100%;
		border-radius: 0.5rem;
		border: 1px solid #d1d5db;
		background-color: #f9fafb;
		padding: 1rem;
		font-size: 1.125rem;
		box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
	}

	.text-area:focus {
		outline: 2px solid transparent;
		outline-offset: 2px;
		box-shadow: 0 0 0 2px #15803d;
	}

	.submit-button {
		align-self: flex-end;
		border-radius: 0.5rem;
		background-color: #15803d;
		padding: 0.5rem 1.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #ffffff;
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 1px 2px 0 rgba(0, 0, 0, 0.06);
		transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.submit-button:hover {
		background-color: #166534;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 0;
	}

	.spinner {
		margin-bottom: 1rem;
		height: 2.5rem;
		width: 2.5rem;
		animation: spin 1s linear infinite;
		border-radius: 9999px;
		border-top-width: 4px;
		border-style: solid;
		border-color: #15803d;
	}

	.loading-text {
		font-size: 1.125rem;
		color: #4b5563;
	}

	.scroll-indicator {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.scroll-text {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: #9ca3af;
	}

	.scroll-arrow {
		height: 1.5rem;
		width: 1.5rem;
		animation: bounce 1s infinite;
		color: #15803d;
	}

	.info-section {
		background-color: #ffffff;
		padding: 5rem 1rem;
	}

	.info-content {
		margin: 0 auto;
		max-width: 56rem;
		text-align: center;
	}

	.info-title {
		margin-bottom: 1rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #166534;
	}

	.info-text {
		margin-bottom: 1.5rem;
		color: #4b5563;
	}

	.features-grid {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2rem;
	}

	@media (min-width: 768px) {
		.features-grid {
			flex-direction: row;
		}
	}

	.feature-card {
		flex: 1;
		border-radius: 0.5rem;
		background-color: #f0fdf4;
		padding: 1.5rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.05);
	}

	.feature-title {
		margin-bottom: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #15803d;
	}

	.feature-text {
		color: #4b5563;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(-25%);
			animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
		}
		50% {
			transform: translateY(0);
			animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
