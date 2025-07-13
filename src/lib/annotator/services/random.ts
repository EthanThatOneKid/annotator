import type { Annotation } from '$lib/annotator/annotation';
import type { AnnotatorService, AnnotateResponse, PredictResponse } from './service';

/**
 * RandomService generates random annotations.
 */
export class RandomService implements AnnotatorService {
	public constructor(private readonly k: number = 1) {}

	public annotate(text: string): AnnotateResponse {
		const annotations = randomRanges(text, this.k).map(([start, end]): Annotation => {
			const annotationId = crypto.randomUUID();
			return {
				annotationId,
				start,
				end
			};
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

function randomRanges(text: string, k = 1): Array<[number, number]> {
	const result: Array<[number, number]> = [];
	const maxRanges = Math.min(k, text.length); // can't have more ranges than text length.
	const maxAttempts = 1000;
	let attempts = 0;

	while (result.length < maxRanges && attempts < maxAttempts) {
		let start = Math.floor(Math.random() * text.length);
		let end = Math.floor(Math.random() * text.length);
		if (start === end) {
			// ensure at least length 1
			end = Math.min(start + 1, text.length);
			start = Math.max(0, start - 1);
		}

		if (start > end) {
			[start, end] = [end, start];
		}

		// ensure non-zero length
		if (end - start < 1) {
			attempts++;
			continue;
		}

		// check for overlap
		if (result.every(([s, e]) => end <= s || start >= e)) {
			result.push([start, end]);
		}

		attempts++;
	}

	// sort ranges by start index
	return result.toSorted((a, b) => a[0] - b[0]);
}
