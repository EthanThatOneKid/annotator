// TODO: Separate annotator and predictor services. Annotator composes Predictor.

/**
 * AnnotatorService generates suggestions from text.
 */
export interface AnnotatorService {
	annotate(textContent: string): AnnotateResponse | Promise<AnnotateResponse>;
	predict(textContent: string): PredictResponse | Promise<PredictResponse>;
}

export interface AnnotateResponse {
	annotations: Annotation[];
	resources: Resource[];
}

export interface PredictResponse {
	predictions: Prediction[];
	resources: Resource[];
}

export interface Resource {
	resourceId: string;
	resourceLabel?: string;
	resourceDescription?: string;
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
	confidence: number;
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
 * applyTopPrediction updates an annotation's reference based on the most
 * confident prediction.
 */
export function applyTopPrediction(annotation: Annotation): Annotation {
	if (annotation.reference !== undefined) {
		return annotation;
	}

	if (!annotation.predictions || annotation.predictions.length === 0) {
		annotation.reference = undefined;
		return annotation;
	}

	const inferred = annotation.predictions.toSorted((a, b) => b.confidence - a.confidence).at(0);
	if (!inferred) {
		annotation.reference = undefined;
		return annotation;
	}

	annotation.reference = inferred.resourceId;
	return annotation;
}
