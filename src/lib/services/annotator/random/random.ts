import type { Annotation } from '$lib/services/annotator/annotator';
import type {
	AnnotateResponse,
	Annotator,
	PredictResponse
} from '$lib/services/annotator/annotator';

/**
 * RandomAnnotator generates random annotations.
 */
export class RandomAnnotator implements Annotator {
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

function randomRanges(
	textContent: string,
	k = 1,
	minRangeSize = 1,
	maxRangeSize = textContent.length
): Array<[number, number]> {
	const result: Array<[number, number]> = [];
	const maxRanges = Math.min(k, textContent.length); // can't have more ranges than text length.
	const maxAttempts = 1000;
	let attempts = 0;

	while (result.length < maxRanges && attempts < maxAttempts) {
		const start = Math.floor(Math.random() * textContent.length);
		const size = Math.floor(Math.random() * (maxRangeSize - minRangeSize + 1)) + minRangeSize;
		let end = start + size;

		// Ensure end does not exceed textContent length
		end = Math.min(end, textContent.length);

		// Ensure non-zero length and valid range size
		if (end - start < minRangeSize) {
			attempts++;
			continue;
		}

		// Check for overlap
		if (result.every(([s, e]) => end <= s || start >= e)) {
			result.push([start, end]);
		}

		attempts++;
	}

	// Sort ranges by start index.
	return result.toSorted((a, b) => a[0] - b[0]);
}
