import type { SearchResponse, Resource } from '$lib/services/semantic-search/semantic-search';
import type { Prediction } from '$lib/services/annotator/annotator';

/**
 * processSearchResponse prepares a search response for use in annotating text.
 */
export function processSearchResponse(searchResponse: SearchResponse) {
	const resources: Resource[] = [];
	const predictions: Prediction[] = [];
	for (const result of searchResponse.results) {
		predictions.push({
			resourceId: result.resource.resourceId,
			confidence: result.confidence
		});
		if (resources.some((resource) => resource.resourceId === result.resource.resourceId)) {
			continue;
		}

		resources.push(result.resource);
	}

	return { resources, predictions };
}
