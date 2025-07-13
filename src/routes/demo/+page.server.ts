import type { PageServerLoad } from './$types';
import type { AnnotatorService, PredictResponse } from '$lib/annotator/services/service';

class CafeService implements AnnotatorService {
	public static readonly text = 'Met up with Angel at The Lost Bean cafe.';

	public async predict(text: string): Promise<PredictResponse> {
		console.assert(text === CafeService.text, 'CafeService received unexpected text input');
		return {
			annotations: [
				{
					annotationId: 'demo-annotation-1',
					start: 0,
					end: 40,
					resourceId: 'event-1'
				},
				{
					annotationId: 'demo-annotation-2',
					start: 12,
					end: 17,
					resourceId: 'person-1'
				},
				{
					annotationId: 'demo-annotation-3',
					start: 21,
					end: 40,
					resourceId: 'cafe-1'
				}
			],
			resources: [
				{
					resourceId: 'person-1',
					resourceLabel: 'Angel'
				},
				{
					resourceId: 'cafe-1',
					resourceLabel: 'The Lost Bean'
				},
				{
					resourceId: 'event-1',
					resourceLabel: 'Ethan:Angel coffee chat'
				}
			]
		};
	}
}

const service = new CafeService();

export const load: PageServerLoad = async () => {
	const data = await service.predict(CafeService.text);
	return {
		text: CafeService.text,
		annotations: data.annotations,
		resources: data.resources
	};
};
