import type { Annotation, Resource } from '$lib/annotator/annotation';

/**
 * AnnotatorDataFn generates suggestions from text.
 */
export interface AnnotatorService {
	predict(text: string): PredictResponse | Promise<PredictResponse>;
}

export interface PredictResponse {
	annotations: Annotation[];
	resources: Resource[];
}
