import type { PageServerLoad } from './$types';
import { CafeAnnotator, CafeSemanticSearch } from './cafe';

const annotator = new CafeAnnotator();

export const load: PageServerLoad = async () => {
	const generated = await annotator.annotate(CafeSemanticSearch.textContent);
	return { textContent: CafeSemanticSearch.textContent, generated };
};
