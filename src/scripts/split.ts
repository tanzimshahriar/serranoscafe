/**
 * Splits an element's text into masked words for line-style reveals.
 * Screen readers get the original sentence from a hidden copy; the animated spans are hidden from them.
 */
export function splitWords(el: HTMLElement, mode: 'mask' | 'plain' = 'mask') {
	if (el.dataset.split) return el.querySelectorAll<HTMLElement>(mode === 'mask' ? '.split-word' : '.scrub-word');

	const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
	const visual = document.createElement('span');
	visual.setAttribute('aria-hidden', 'true');

	text.split(' ').forEach((word, i, words) => {
		const inner = document.createElement('span');
		inner.textContent = word;
		if (mode === 'mask') {
			const mask = document.createElement('span');
			mask.className = 'split-line';
			mask.style.display = 'inline-block';
			inner.className = 'split-word';
			mask.append(inner);
			visual.append(mask);
		} else {
			inner.className = 'scrub-word';
			visual.append(inner);
		}
		if (i < words.length - 1) visual.append(' ');
	});

	const reader = document.createElement('span');
	reader.className = 'sr-only';
	reader.textContent = text;

	el.replaceChildren(reader, visual);
	el.dataset.split = mode;
	return el.querySelectorAll<HTMLElement>(mode === 'mask' ? '.split-word' : '.scrub-word');
}
