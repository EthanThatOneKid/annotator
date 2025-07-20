import type { Resource } from '$lib/services/semantic-search/semantic-search';

// TODO: Consider: Rename Annotator interface to AnnotatorService.

/**
 * Annotator generates suggestions from text.
 */
export interface Annotator {
	annotate(textContent: string): AnnotateResponse | Promise<AnnotateResponse>;
}

export interface AnnotateResponse {
	annotations: Annotation[];
	resources: Resource[];
}

/**
 * Annotation is a resource-oriented range of text within some source text.
 */
export interface Annotation {
	annotationId: string;
	start: number;
	end: number;

	/**
	 * reference is resource ID that associated with this annotation.
	 */
	reference?: string;

	/**
	 * predictions is a list of resources predicted to be associated with this annotation.
	 */
	predictions?: Prediction[];
}

export interface Prediction {
	resourceId: string;

	/**
	 * confidence is a value between 0 and 1 indicating the confidence of the prediction.
	 */
	confidence?: number;
}

/**
 * intersection returns a list of annotations that intersect with the given range.
 */
export function intersection(annotations: Annotation[], range: Range | null): Annotation[] {
	if (range === null) {
		return [];
	}

	return annotations.filter((a) => a.start <= range.startOffset && a.end >= range.endOffset) ?? [];
}

/**
 * applyConfidentPrediction updates an annotation's reference based on the
 * most confident prediction.
 */
export function applyConfidentPrediction(annotation: Annotation): Annotation {
	if (annotation.reference !== undefined) {
		return annotation;
	}

	if (annotation.predictions?.every((p) => p.confidence === undefined)) {
		return annotation;
	}

	if (!annotation.predictions || annotation.predictions.length === 0) {
		annotation.reference = undefined;
		return annotation;
	}

	const inferred = annotation.predictions
		.toSorted((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
		.at(0);
	annotation.reference = inferred?.resourceId;
	return annotation;
}
