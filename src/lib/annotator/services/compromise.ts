import nlp from 'compromise';
import type { Annotation } from '$lib/annotator/annotation';
import type { AnnotatorService, PredictResponse } from './service';

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
	async predict(text: string): Promise<PredictResponse> {
		await new Promise((resolve) => setTimeout(resolve, 500));

		const doc = nlp(text);
		const annotations: Annotation[] = [];

		patterns.forEach((pattern) => {
			const captures: CompromiseCapture[] = doc[pattern]().json({
				offset: true
			});
			captures.forEach((capture) => {
				annotations.push({
					annotationId: crypto.randomUUID(),
					rangeStart: capture.offset.start,
					rangeEnd: capture.offset.start + capture.offset.length
				});
			});
		});

		return {
			annotations,
			resources: []
		};
	}
}
