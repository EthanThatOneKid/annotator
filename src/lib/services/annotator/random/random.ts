import type { Annotation } from '$lib/services/annotator/annotator';
import type {
	AnnotateResponse,
	AnnotatorService,
	PredictResponse
} from '$lib/services/annotator/annotator';

/**
 * RandomService generates random annotations.
 */
export class RandomService implements AnnotatorService {
	public constructor(private readonly k: number = 1) {}

	public annotate(textContent: string): AnnotateResponse {
		const annotations = randomRanges(textContent, this.k).map(([start, end]): Annotation => {
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

function randomRanges(textContent: string, k = 1): Array<[number, number]> {
	const result: Array<[number, number]> = [];
	const maxRanges = Math.min(k, textContent.length); // can't have more ranges than text length.
	const maxAttempts = 1000;
	let attempts = 0;

	while (result.length < maxRanges && attempts < maxAttempts) {
		let start = Math.floor(Math.random() * textContent.length);
		let end = Math.floor(Math.random() * textContent.length);
		if (start === end) {
			// ensure at least length 1
			end = Math.min(start + 1, textContent.length);
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
