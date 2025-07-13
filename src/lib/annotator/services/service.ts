import type { Annotation, Prediction, Resource } from '$lib/annotator/annotation';

/**
 * AnnotatorService generates suggestions from text.
 */
export interface AnnotatorService {
	annotate(text: string): AnnotateResponse | Promise<AnnotateResponse>;
	predict(text: string): PredictResponse | Promise<PredictResponse>;
}

export interface AnnotateResponse {
	annotations: Annotation[];
	resources: Resource[];
}

export interface PredictResponse {
	predictions: Prediction[];
	resources: Resource[];
}
