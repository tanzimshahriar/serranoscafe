/**
 * The critical path: nav, mobile action bar and live open status. Everything heavy
 * (GSAP, ScrollTrigger, Lenis, the menu, the 3D beans) loads after first paint, so the
 * hero paints on the first frame and the main thread never blocks for long.
 */
import { initOpenStatus } from './status';
import type { MotionApi } from './motion';

declare global {
	interface Window {
		__serranos?: boolean;
		__serranosHash?: string;
	}
}

const html = document.documentElement;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

window.__serranos = true;

/* ----------------------------------------------------- deferred motion */

let api: MotionApi | null = null;

const scrollToTarget = (target: HTMLElement | 0) => {
	if (api) return api.scrollTo(target);
	const offset = target === 0 ? 0 : parseFloat(getComputedStyle(target).scrollMarginTop) || 88;
	const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
	window.scrollTo({ top });
};

/**
 * Runs once the page has loaded, painted its first frames and gone idle, so nothing here
 * competes with the hero image or the fonts for bandwidth or main-thread time.
 */
const whenIdle = (fn: () => void) => {
	const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
	// The hero photo is the largest paint. Decoding is async, so it can land a frame or two
	// after `load`: wait until it is decoded, then let two frames paint it.
	const lcp = document.querySelector<HTMLImageElement>('img[fetchpriority="high"]');
	const go = () =>
		(lcp?.decode() ?? Promise.resolve())
			.catch(() => {})
			.then(() => requestAnimationFrame(() => requestAnimationFrame(idle)));
	if (document.readyState === 'complete') go();
	else window.addEventListener('load', go, { once: true });
};

whenIdle(() => {
	import('./motion')
		.then((m) => m.boot())
		.then((ready) => (api = ready))
		.catch(() => html.classList.add('reduced'));

	// The 3D layer is its own chunk: only pages that have a scene download it.
	const scenes = document.querySelectorAll<HTMLElement>('[data-beans]');
	if (scenes.length) import('./beans').then((m) => scenes.forEach((el) => m.mountBeans(el))).catch(() => {});
});

/* ------------------------------------------------------------ in-page links */

document.addEventListener('click', (event) => {
	const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
	if (!link) return;
	const hash = link.getAttribute('href') ?? '';
	const target = hash === '#top' ? 0 : $(hash);
	if (target === null) return;
	event.preventDefault();
	closeSheet();
	// The URL keeps no #hash, so a refresh starts from the top instead of mid-page.
	scrollToTarget(target);
});

/* ----------------------------------------------------------------- nav */

const nav = $('[data-nav]');
const sheet = $('[data-sheet]');
const burger = $<HTMLButtonElement>('[data-burger]');

function openSheet() {
	if (!nav || !sheet || !burger) return;
	sheet.hidden = false;
	requestAnimationFrame(() => nav.classList.add('is-open'));
	burger.setAttribute('aria-expanded', 'true');
	burger.querySelector('.sr-only')!.textContent = 'Close menu';
	api?.lenis?.stop();
	document.body.style.overflow = 'hidden';
}

function closeSheet() {
	if (!nav || !sheet || !burger || !nav.classList.contains('is-open')) return;
	nav.classList.remove('is-open');
	burger.setAttribute('aria-expanded', 'false');
	burger.querySelector('.sr-only')!.textContent = 'Open menu';
	api?.lenis?.start();
	document.body.style.overflow = '';
	window.setTimeout(() => {
		if (!nav.classList.contains('is-open')) sheet.hidden = true;
	}, 700);
}

burger?.addEventListener('click', () => (nav?.classList.contains('is-open') ? closeSheet() : openSheet()));
document.addEventListener('keydown', (event) => event.key === 'Escape' && closeSheet());

let lastY = 0;
const onScroll = () => {
	const y = window.scrollY;
	nav?.classList.toggle('is-scrolled', y > 40);
	nav?.classList.toggle('is-hidden', y > 320 && y > lastY + 2);
	if (y < lastY - 2 || y <= 320) nav?.classList.remove('is-hidden');
	html.classList.toggle('nav-shown', y > 40 && !nav?.classList.contains('is-hidden'));
	lastY = y;
};
window.addEventListener('scroll', onScroll, { passive: true });
// Reading scrollY forces layout; do it inside the first frame instead of during module evaluation.
requestAnimationFrame(onScroll);

/* ------------------------------------------------------ mobile action bar */

const actionbar = $('[data-actionbar]');
const heroEl = $('[data-hero], [data-page-hero]');
if (actionbar && heroEl) {
	new IntersectionObserver(([entry]) => actionbar.classList.toggle('is-visible', !entry.isIntersecting), {
		rootMargin: '-40% 0px 0px 0px',
	}).observe(heroEl);
}

/* ------------------------------------------------------- live open status */

initOpenStatus();
