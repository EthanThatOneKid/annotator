import type { Resource, SemanticSearch } from '$lib/services/semantic-search/semantic-search';
import type { AnnotateResponse, Annotator } from '$lib/services/annotator/annotator';
import type { Annotation } from '$lib/services/annotator/annotator';
import { processSearchResponse } from '$lib/services/annotator/process-search-response';

/**
 * RandomAnnotator generates random annotations.
 */
export class RandomAnnotator implements Annotator {
	public constructor(
		private readonly semanticSearch: SemanticSearch,
		private readonly k = 1
	) {}

	public async annotate(textContent: string): Promise<AnnotateResponse> {
		const annotations: Annotation[] = [];
		const resources: Resource[] = [];
		for (const [start, end] of randomRanges(textContent, this.k)) {
			const substring = textContent.slice(start, end);
			const searchResponse = await this.semanticSearch.search(substring);
			const processedSearchResponse = processSearchResponse(searchResponse);
			for (const resource of processedSearchResponse.resources) {
				if (
					resources.some((existingResource) => existingResource.resourceId === resource.resourceId)
				) {
					continue;
				}

				resources.push(resource);
			}

			annotations.push({
				annotationId: crypto.randomUUID(),
				start,
				end,
				predictions: processedSearchResponse.predictions
			});
		}

		return { annotations, resources };
	}
}

function randomRanges(
	textContent: string,
	k = 1,
	minRangeSize = 1,
	maxRangeSize = textContent.length
): Array<[number, number]> {
	const result: Array<[number, number]> = [];
	const maxRanges = Math.min(k, textContent.length); // can't have more ranges than text length.
	const maxAttempts = 1000;
	let attempts = 0;

	while (result.length < maxRanges && attempts < maxAttempts) {
		const start = Math.floor(Math.random() * textContent.length);
		const size = Math.floor(Math.random() * (maxRangeSize - minRangeSize + 1)) + minRangeSize;
		let end = start + size;

		// Ensure end does not exceed textContent length.
		end = Math.min(end, textContent.length);

		// Ensure non-zero length and valid range size.
		if (end - start < minRangeSize) {
			attempts++;
			continue;
		}

		// Check for overlap.
		if (result.every(([s, e]) => end <= s || start >= e)) {
			result.push([start, end]);
		}

		attempts++;
	}

	// Sort ranges by start index.
	return result.toSorted((a, b) => a[0] - b[0]);
}
