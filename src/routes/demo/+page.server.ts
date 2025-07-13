import type { PageServerLoad } from './$types';
import { CompromiseService } from '$lib/annotator/services/compromise';

const service = new CompromiseService();

// import type { AnnotatorService, PredictResponse } from '$lib/annotator/services/service';

// class DemoService implements AnnotatorService {
// 	public async predict(text: string): Promise<PredictResponse> {
// 		return {
// 			annotations: [],
// 			resources: []
// 		};
// 	}
// }

export const load: PageServerLoad = async ({ fetch }) => {
	const quote = await fetch('https://zenquotes.io/api/random')
		.then((response) => response.json())
		.then((data) => {
			return data[0].q as string;
		});

	const data = await service.predict(quote);
	console.dir({ quote, ...data }, { depth: null });
	return {
		text: quote,
		annotations: data.annotations,
		resources: data.resources
	};
};
