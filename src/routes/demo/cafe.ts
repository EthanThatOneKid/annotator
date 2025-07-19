import type {
	AnnotateResponse,
	AnnotatorService,
	PredictResponse,
	Resource
} from '$lib/services/annotator/annotator';

export class CafeService implements AnnotatorService {
	public static readonly textContent = 'Met up with Angel at The Lost Bean cafe.';
	public static readonly resources: Record<string, Resource> = {
		'person-1': {
			resourceId: 'person-1',
			emoji: '👨',
			label: 'Angel C.'
		},
		'person-2': {
			resourceId: 'person-2',
			emoji: '👨',
			label: 'John M.'
		},
		'person-3': {
			resourceId: 'person-3',
			emoji: '👨',
			label: 'Ethan D.'
		},
		'cafe-1': {
			resourceId: 'cafe-1',
			emoji: '☕️',
			label: 'The Lost Bean'
		},
		'cafe-2': {
			resourceId: 'cafe-2',
			emoji: '☕️',
			label: 'Play Coffee'
		}
	};
	public static readonly responses: Record<string, PredictResponse> = {
		Angel: {
			resources: [
				CafeService.resources['person-1'],
				CafeService.resources['person-2'],
				CafeService.resources['person-3']
			],
			predictions: [
				{ resourceId: 'person-1', confidence: 0.8 },
				{ resourceId: 'person-2', confidence: 0.6 },
				{ resourceId: 'person-3', confidence: 0.4 }
			]
		},
		'The Lost Bean cafe.': {
			resources: [CafeService.resources['cafe-1'], CafeService.resources['cafe-2']],
			predictions: [
				{ resourceId: 'cafe-1', confidence: 0.9 },
				{ resourceId: 'cafe-2', confidence: 0.7 }
			]
		}
	};

	public async annotate(textContent: string): Promise<AnnotateResponse> {
		console.assert(
			textContent === CafeService.textContent,
			'CafeService received unexpected text input'
		);
		return {
			annotations: [
				{
					annotationId: 'demo-annotation-2',
					start: 12,
					end: 17,
					predictions: CafeService.responses['Angel'].predictions
				},
				{
					annotationId: 'demo-annotation-3',
					start: 21,
					end: 40,
					predictions: CafeService.responses['The Lost Bean cafe.'].predictions
				}
			],
			resources: Object.values(CafeService.resources)
		};
	}

	public predict(textContent: string): PredictResponse {
		return (
			CafeService.responses[textContent] ?? {
				predictions: [],
				resources: []
			}
		);
	}
}
