import nlp from 'compromise';
import type { Annotation } from './annotation';

/**
 * generateCompromiseAnnotations generates annotations with Compromise.
 *
 * @see http://compromise.cool/
 */
export function generateCompromiseAnnotations(text: string): Annotation[] {
	const doc = nlp(text);
	const topics: Array<{
		text: string;
		offset: { index: number; start: number; length: number };
	}> = doc.topics().json({ offset: true });
	return topics.map((topic, i) => ({
		annotationId: `annotation-${i}`,
		rangeStart: topic.offset.start,
		rangeEnd: topic.offset.start + topic.offset.length
	}));
}
