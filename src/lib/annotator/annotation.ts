/**
 * Annotation is a range of text within some source text.
 */
export interface Annotation {
	annotationId: string;
	sourceId: string;
	rangeStart: number;
	rangeEnd: number;
	rangeText: string;
}

/**
 * toRange converts an Annotation to a Range that can be used to highlight text.
 */
export function toRange(node: Node, annotation: Annotation) {
	const range = new Range();
	range.setStart(node, annotation.rangeStart);
	range.setEnd(node, annotation.rangeEnd);
	return range;
}
