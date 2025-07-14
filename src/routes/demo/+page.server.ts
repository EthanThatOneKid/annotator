import type { PageServerLoad } from './$types';
import { CafeService } from './cafe';

const service = new CafeService();

export const load: PageServerLoad = async () => {
	const generated = await service.annotate(CafeService.textContent);
	return { textContent: CafeService.textContent, generated };
};
