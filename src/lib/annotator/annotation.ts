export interface Resource {
	resourceId?: string;
	resourceType?: string;
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
	resourceId?: string;
	predictions?: Prediction[];
}

export interface Prediction {
	resourceId: string;
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
