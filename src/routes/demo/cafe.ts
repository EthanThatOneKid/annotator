import type {
	Resource,
	SearchResponse,
	SemanticSearch
} from '$lib/services/semantic-search/semantic-search';
import type { AnnotateResponse, Annotator } from '$lib/services/annotator/annotator';
import { processSearchResponse } from '$lib/services/annotator/process-search-response';

export class CafeSemanticSearch implements SemanticSearch {
	public static readonly textContent = 'Met up with Angel at The Lost Bean cafe.';
	public static readonly resources = Object.fromEntries<Resource>(
		[
			{
				resourceId: 'person-1',
				emoji: '👨',
				label: 'Angel C.'
			},
			{
				resourceId: 'person-2',
				emoji: '👨',
				label: 'John M.'
			},
			{
				resourceId: 'person-3',
				emoji: '👨',
				label: 'Ethan D.'
			},
			{
				resourceId: 'cafe-1',
				emoji: '☕️',
				label: 'The Lost Bean'
			},
			{
				resourceId: 'cafe-2',
				emoji: '☕️',
				label: 'Play Coffee'
			}
		].map((resource) => [resource.resourceId, resource])
	);
	public static readonly responses: Record<string, SearchResponse> = {
		Angel: {
			results: [
				{ resource: CafeSemanticSearch.resources['person-1'], confidence: 0.8 },
				{ resource: CafeSemanticSearch.resources['person-2'], confidence: 0.6 },
				{ resource: CafeSemanticSearch.resources['person-3'], confidence: 0.4 }
			]
		},
		'The Lost Bean cafe.': {
			results: [
				{ resource: CafeSemanticSearch.resources['cafe-1'], confidence: 0.9 },
				{ resource: CafeSemanticSearch.resources['cafe-2'], confidence: 0.7 }
			]
		}
	};

	public async search(textContent: string): Promise<SearchResponse> {
		console.assert(
			Object.hasOwn(CafeSemanticSearch.responses, textContent),
			'CafeSemanticSearch received unexpected text input'
		);
		return CafeSemanticSearch.responses[textContent] ?? { results: [] };
	}
}

export class CafeAnnotator implements Annotator {
	public async annotate(textContent: string): Promise<AnnotateResponse> {
		console.assert(
			textContent === CafeSemanticSearch.textContent,
			'CafeAnnotator received unexpected text input'
		);
		return {
			annotations: [
				{
					annotationId: 'demo-annotation-2',
					start: 12,
					end: 17,
					predictions: processSearchResponse(CafeSemanticSearch.responses['Angel']).predictions
				},
				{
					annotationId: 'demo-annotation-3',
					start: 21,
					end: 40,
					predictions: processSearchResponse(CafeSemanticSearch.responses['The Lost Bean cafe.'])
						.predictions
				}
			],
			resources: Object.values(CafeSemanticSearch.resources)
		};
	}
}
