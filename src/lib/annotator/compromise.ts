import nlp from 'compromise';
import type { Annotation } from './annotation';

interface CompromiseCapture {
	text: string;
	offset: CompromiseOffset;
}

interface CompromiseOffset {
	index: number;
	start: number;
	length: number;
}

const patterns = {
	topics: 'Topic',
	pronouns: 'Pronoun'
} as const;

/**
 * generateCompromiseAnnotations generates annotations with Compromise.
 *
 * @see https://compromise.cool/
 */
export async function generateCompromiseAnnotations(text: string): Promise<Annotation[]> {
	await new Promise((resolve) => setTimeout(resolve, 500));

	const doc = nlp(text);
	const annotations: Annotation[] = [];
	(Object.keys(patterns) as Array<keyof typeof patterns>).forEach((pattern) => {
		const captures: CompromiseCapture[] = doc[pattern]().json({
			offset: true
		});
		captures.forEach((capture) => {
			annotations.push({
				annotationId: crypto.randomUUID(),
				rangeStart: capture.offset.start,
				rangeEnd: capture.offset.start + capture.offset.length,
				reason: patterns[pattern]
			});
		});
	});

	return annotations;
}
