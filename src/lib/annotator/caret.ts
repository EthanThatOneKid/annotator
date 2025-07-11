export function getCaretRange(clientX: number, clientY: number) {
	const range = document.caretRangeFromPoint(clientX, clientY);
	if (!range) {
		console.warn('document.caretRangeFromPoint is not supported');
		return getCaretRangeFromCaretPosition(document.caretPositionFromPoint?.(clientX, clientY));
	}

	return range;
}

function getCaretRangeFromCaretPosition(position: CaretPosition | null) {
	if (position === null) {
		return null;
	}

	const range = document.createRange();
	range.setStart(position.offsetNode, position.offset);
	range.collapse(true);
	return range;
}
