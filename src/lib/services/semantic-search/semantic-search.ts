export interface SemanticSearch {
	search(textContent: string): Promise<SearchResponse>;
}

export interface SearchResponse {
	results: SearchResponseResult[];
}

export interface SearchResponseResult {
	resource: Resource;
	confidence?: number;
}

export interface Resource {
	resourceId: string;
	label?: string;
	description?: string;
	emoji?: string;
}
