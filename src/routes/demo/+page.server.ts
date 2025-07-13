import type { PageServerLoad } from './$types';
import type {
	AnnotatorService,
	AnnotateResponse,
	PredictResponse
} from '$lib/annotator/services/service';

class CafeService implements AnnotatorService {
	public static readonly text = 'Met up with Angel at The Lost Bean cafe.';

	public async annotate(text: string): Promise<AnnotateResponse> {
		console.assert(text === CafeService.text, 'CafeService received unexpected text input');
		return {
			annotations: [
				{
					annotationId: 'demo-annotation-1',
					start: 0,
					end: 40,
					predictions: [{ resourceId: 'event-1', confidence: 0.9 }]
				},
				{
					annotationId: 'demo-annotation-2',
					start: 12,
					end: 17,
					predictions: [
						{ resourceId: 'person-1', confidence: 0.8 },
						{ resourceId: 'person-2', confidence: 0.6 },
						{ resourceId: 'person-3', confidence: 0.4 }
					]
				},
				{
					annotationId: 'demo-annotation-3',
					start: 21,
					end: 40,
					predictions: [
						{ resourceId: 'cafe-1', confidence: 0.9 },
						{ resourceId: 'cafe-2', confidence: 0.7 }
					]
				}
			],
			resources: [
				{
					resourceId: 'person-1',
					resourceLabel: 'Angel'
				},
				{
					resourceId: 'person-2',
					resourceLabel: 'John'
				},
				{
					resourceId: 'person-3',
					resourceLabel: 'Ethan'
				},
				{
					resourceId: 'cafe-1',
					resourceLabel: 'The Lost Bean'
				},
				{
					resourceId: 'cafe-2',
					resourceLabel: 'Play Coffee'
				},
				{
					resourceId: 'event-1',
					resourceLabel: 'Ethan:Angel coffee chat'
				}
			]
		};
	}

	public predict(): PredictResponse {
		return {
			predictions: [],
			resources: []
		};
	}
}

const service = new CafeService();

export const load: PageServerLoad = async () => {
	const data = await service.annotate(CafeService.text);
	return {
		text: CafeService.text,
		annotations: data.annotations,
		resources: data.resources
	};
};
