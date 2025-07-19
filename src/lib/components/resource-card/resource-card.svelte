<script lang="ts">
	import type { Resource } from '$lib/services/annotator/annotator';

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
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.5em;
		border-radius: 6px;
		background: var(--card-background);
	}

	.resource-card-grid {
		display: flex;
		align-items: center;
		gap: 0.5em;
		width: 100%;
	}

	.resource-card-emoji {
		font-size: 1.5em;
		flex-shrink: 0;
		width: 36px;
		text-align: center;
	}

	.resource-card-content {
		flex: 1;
		min-width: 0;
	}

	.resource-card-label {
		font-size: 1.2em;
		margin: 0 0 0.25em 0;
	}

	.resource-card-description {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: break-spaces;
		margin: 0;
	}
</style>
