// TODO: Separate annotator and semantic search services. Annotator composes SemanticSearch.

export interface SemanticSearch {
	search(textContent: string): Promise<Resource[]>;
}

export interface Resource {
	resourceId: string;
	label?: string;
	description?: string;
	emoji?: string;
}
