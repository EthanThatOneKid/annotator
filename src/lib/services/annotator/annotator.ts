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
	 * resourceId is the ID of the resource associated with this annotation.
	 */
	resourceId?: string;

	/**
	 * predictions is a list of resources predicted to be associated with this annotation.
	 */
	predictions?: Prediction[];

	/**
	 * content is the comment associated with the annotation.
	 */
	content?: string;
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
