import nlp from 'compromise';
import type { AnnotateResponse, Annotation, Annotator } from '$lib/services/annotator/annotator';
import type { SemanticSearch, Resource } from '$lib/services/semantic-search/semantic-search';

interface CompromiseCapture {
	text: string;
	offset: CompromiseOffset;
}

interface CompromiseOffset {
	index: number;
	start: number;
	length: number;
}

const methods = ['topics', 'pronouns'] as const;

/**
 * CompromiseAnnotator manages annotatioons with Compromise.
 *
 * @see https://compromise.cool/
 */
export class CompromiseAnnotator implements Annotator {
	public constructor(
		private readonly semanticSearch: SemanticSearch,
		private readonly k = 1
	) {}

	public async annotate(textContent: string): Promise<AnnotateResponse> {
		const annotations: Annotation[] = [];
		const resources: Resource[] = [];

		const doc = nlp(textContent);
		for (const method of methods) {
			const captures: CompromiseCapture[] = doc[method]().json({ offset: true });
			for (const capture of captures) {
				const searchResponse = await this.semanticSearch.search(capture.text);
				for (const prediction of searchResponse.results) {
					if (
						resources.some((resource) => resource.resourceId === prediction.resource.resourceId)
					) {
						continue;
					}

					resources.push(prediction.resource);
				}

				annotations.push({
					annotationId: crypto.randomUUID(),
					start: capture.offset.start,
					end: capture.offset.start + capture.offset.length,
					predictions: searchResponse.results.map((prediction) => ({
						resourceId: prediction.resource.resourceId,
						confidence: prediction.confidence
					}))
				});
			}
		}

		return { annotations, resources };
	}
}
