import type {
	SemanticSearch,
	SearchResponse
} from '$lib/services/semantic-search/semantic-search.ts';

/**
 * MediawikiOpensearch implements SemanticSearch with the MediaWiki OpenSearch
 * API.
 */
export class MediawikiOpensearch implements SemanticSearch {
	public async search(textContent: string): Promise<SearchResponse> {
		const searchResults = await searchWikipedia(textContent);
		const results = searchResults.map((result) => ({
			resource: {
				resourceId: encodeURIComponent(result.url),
				title: result.title,
				description: result.description
			}
		}));

		return { results };
	}
}

/**
 * OpenSearchResult represents the structure of the JSON response from the
 * MediaWiki OpenSearch API.
 * The response is an array (tuple) with a specific order:
 * 1. The original search term.
 * 2. An array of result titles.
 * 3. An array of short descriptions for each result.
 * 4. An array of URLs for each result.
 */
export type OpenSearchResult = [string, string[], string[], string[]];

/**
 * FormattedOpenSearchResult is a more structured object to hold a single
 * search result item, making it easier to work with.
 */
export interface FormattedOpenSearchResult {
	title: string;
	description: string;
	url: string;
}

/**
 * searchWikipedia asynchronously fetches search results from the English Wikipedia API using the OpenSearch protocol.
 */
export async function searchWikipedia(searchTerm: string): Promise<FormattedOpenSearchResult[]> {
	// The base URL for the English Wikipedia API
	const endpoint = 'https://en.wikipedia.org/w/api.php';

	// Parameters for the OpenSearch API call
	const params = new URLSearchParams({
		action: 'opensearch',
		search: searchTerm,
		limit: '10', // Get up to 10 results
		namespace: '0', // Search only in the main article namespace
		format: 'json',
		origin: '*' // Required for CORS when calling from a browser
	});

	// Make the network request using fetch
	const url = `${endpoint}?${params.toString()}`;
	const response = await fetch(url);

	// Check if the request was successful
	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	}

	// Parse the JSON response and cast it to our defined type
	const data: OpenSearchResult = await response.json();

	// The API returns arrays for titles, descriptions, and URLs.
	// We can format this into a more usable array of objects.
	const [, titles, descriptions, urls] = data;

	console.log({ data });
	const formattedResults: FormattedOpenSearchResult[] = titles.map((title, index) => ({
		title: title,
		description: descriptions[index],
		url: urls[index]
	}));

	return formattedResults;
}
