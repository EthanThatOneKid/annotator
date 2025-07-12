/**
 * AnnotatorDataFn generates suggestions from text.
 */
export type AnnotatorDataFn = (text: string) => AnnotatorData | Promise<AnnotatorData>;

export interface AnnotatorData {
	annotations: Annotation[];
	resources: Resource[];
}

export interface Resource {
	resourceId: string;
	resourceType?: string;
	resourceLabel?: string;
	resourceDescription?: string;
}

/**
 * Annotation is a resource-oriented range of text within some source text.
 */
export interface Annotation {
	annotationId: string;
	rangeStart: number;
	rangeEnd: number;
	predictions?: Prediction[];
}

export interface Prediction {
	resourceId: string;
	score: string;
}

/**
 * toRange converts an Annotation to a highlightable Range of text.
 */
export function toRange(node: Node, annotation: Annotation) {
	if (node.nodeType !== Node.TEXT_NODE) {
		throw new Error('toRange: node must be a text node');
	}

	const textLength = (node.textContent ?? '').length;
	const start = Math.max(0, Math.min(annotation.rangeStart, textLength));
	const end = Math.max(start, Math.min(annotation.rangeEnd, textLength));
	const range = new Range();
	range.setStart(node, start);
	range.setEnd(node, end);
	return range;
}
