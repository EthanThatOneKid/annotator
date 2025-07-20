<script lang="ts">
	import type { Resource } from '$lib/services/semantic-search/semantic-search';

	let {
		resource,
		descriptionMaxLength = 2000
	}: { resource: Resource; descriptionMaxLength?: number } = $props();
</script>

<div class="resource-card">
	<div class="resource-card-grid">
		<span class="resource-card-emoji" role="img" aria-label="Resource icon">{resource.emoji}</span>
		<div class="resource-card-content">
			<h2 class="resource-card-label">{resource.label ?? 'Unlabeled resource'}</h2>
			{#if resource.description}
				<p class="resource-card-description">
					{resource.description.substring(0, descriptionMaxLength)}
					{#if resource.description.length > descriptionMaxLength}&hellip;{/if}
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.resource-card {
		box-sizing: border-box;
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--card-gap, 0.75em);
		padding: 1em;
		border-radius: 6px;
		background: var(--card-background);
		border: 1px solid var(--border-color, #e0e0e0);
		margin-bottom: 0.75em;
	}

	.resource-card-grid {
		display: flex;
		align-items: center;
		gap: var(--card-gap, 0.75em);
		width: 100%;
	}

	.resource-card-emoji {
		font-size: 1.7em;
		flex-shrink: 0;
		width: 40px;
		text-align: center;
	}

	.resource-card-content {
		flex: 1;
		min-width: 0;
		padding-left: 0.25em;
	}

	.resource-card-label {
		font-size: 1.2em;
		margin: 0 0 0.35em 0;
	}

	.resource-card-description {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: break-spaces;
		margin: 0;
		color: #444;
		font-size: 1em;
	}
</style>
