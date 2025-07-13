import nlp from 'compromise';
import type {
	AnnotateResponse,
	Annotation,
	AnnotatorService,
	PredictResponse
} from '$lib/services/annotator/annotator';

interface CompromiseCapture {
	text: string;
	offset: CompromiseOffset;
}

interface CompromiseOffset {
	index: number;
	start: number;
	length: number;
}

const patterns = ['topics', 'pronouns'] as const;

/**
 * AnnotatorService manages annotatioons with Compromise.
 *
 * @see https://compromise.cool/
 */
export class CompromiseService implements AnnotatorService {
	public async annotate(textContent: string): Promise<AnnotateResponse> {
		await new Promise((resolve) => setTimeout(resolve, 500));

		const doc = nlp(textContent);
		const annotations: Annotation[] = [];

		patterns.forEach((pattern) => {
			const captures: CompromiseCapture[] = doc[pattern]().json({
				offset: true
			});
			captures.forEach((capture) => {
				annotations.push({
					annotationId: crypto.randomUUID(),
					start: capture.offset.start,
					end: capture.offset.start + capture.offset.length
				});
			});
		});

		return {
			annotations,
			resources: []
		};
	}

	public predict(): PredictResponse {
		return {
			predictions: [],
			resources: []
		};
	}
}
