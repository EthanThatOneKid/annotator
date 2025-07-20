import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const textContent = url.searchParams.get('t');
	return { textContent };
};
