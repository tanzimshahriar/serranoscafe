import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { splitWords } from './split';
import { initOpenStatus } from './status';
import { initMenu } from './menu';

declare global {
	interface Window {
		__serranos?: boolean;
		__serranosHash?: string;
	}
}

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const motion = !html.classList.contains('reduced');
const desktop = '(min-width: 861px)';
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

window.__serranos = true;

/* ------------------------------------------------------------- scrolling */

let lenis: Lenis | null = null;

if (motion) {
	lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis?.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);
}

const scrollToTarget = (target: HTMLElement | 0) => {
	const offset = target === 0 ? 0 : parseFloat(getComputedStyle(target).scrollMarginTop) || 88;
	const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
	if (lenis) lenis.scrollTo(top, { duration: 1.4 });
	else window.scrollTo({ top });
};

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
	lenis?.stop();
	document.body.style.overflow = 'hidden';
}

function closeSheet() {
	if (!nav || !sheet || !burger || !nav.classList.contains('is-open')) return;
	nav.classList.remove('is-open');
	burger.setAttribute('aria-expanded', 'false');
	burger.querySelector('.sr-only')!.textContent = 'Open menu';
	lenis?.start();
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
onScroll();

/* ------------------------------------------------------ mobile action bar */

const actionbar = $('[data-actionbar]');
const heroEl = $('[data-hero]');
if (actionbar && heroEl) {
	new IntersectionObserver(([entry]) => actionbar.classList.toggle('is-visible', !entry.isIntersecting), {
		rootMargin: '-40% 0px 0px 0px',
	}).observe(heroEl);
}

/* ------------------------------------------------------- live open status */

initOpenStatus();
initMenu({ motion, onLayoutChange: () => ScrollTrigger.refresh(), scrollTo: scrollToTarget });

/* ---------------------------------------------------------------- motion */

if (motion) {
	initHero();
	initReveals();
	initMarquees();
	initStory();
	initCut();
	initSignatures();
	initParallax();
	initFooter();
	initCursor();
	initMagnetic();

	document.fonts?.ready.then(() => ScrollTrigger.refresh());
	window.addEventListener('load', () => {
		ScrollTrigger.refresh();
		// A shared link like /#menu travels there once the pins have their real height.
		const shared = document.getElementById(decodeURIComponent((window.__serranosHash ?? '').slice(1)));
		if (shared) requestAnimationFrame(() => scrollToTarget(shared));
	});
}

/** The intro itself is CSS (see Hero.astro); this only drives the scroll-out. */
function initHero() {
	const hero = $('[data-hero]');
	if (!hero) return;
	const img = $('[data-hero-img]', hero);

	// On the way out, the cut sweeps further left and the plate drifts.
	gsap.matchMedia().add(desktop, () => {
		const out = gsap.timeline({
			scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
		});
		out.to(hero, { '--cut-scroll': 12, ease: 'none' }, 0)
			.to(img, { yPercent: 12, ease: 'none' }, 0)
			.to($$('.hero__title', hero), { yPercent: -18, ease: 'none' }, 0)
			.to($('.hero__foot', hero), { yPercent: -30, opacity: 0, ease: 'power1.in' }, 0);
	});
}

function initReveals() {
	$$('[data-reveal="lines"]').forEach((el) => {
		const words = splitWords(el);
		gsap.set(words, { yPercent: 135 });
		gsap.to(words, {
			yPercent: 0,
			duration: 1.2,
			stagger: 0.06,
			ease: 'expo.out',
			scrollTrigger: { trigger: el, start: 'top 88%', once: true },
		});
	});

	ScrollTrigger.batch('[data-reveal="fade"]', {
		start: 'top 90%',
		once: true,
		onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }),
	});
}

function initMarquees() {
	$$('[data-marquee]').forEach((marquee) => {
		const track = $('[data-marquee-track]', marquee);
		if (!track) return;
		const dir = Number(marquee.dataset.direction) || 1;
		const loop = gsap.fromTo(
			track,
			{ xPercent: dir > 0 ? 0 : -50 },
			{ xPercent: dir > 0 ? -50 : 0, duration: 38, ease: 'none', repeat: -1 },
		);

		// Scrolling speeds the band up, and scrolling back reverses it.
		let boost: gsap.core.Animation = gsap.to({}, {});
		ScrollTrigger.create({
			trigger: marquee,
			start: 'top bottom',
			end: 'bottom top',
			onUpdate: (self) => {
				const v = self.getVelocity();
				const speed = gsap.utils.clamp(1, 7, 1 + Math.abs(v) / 260) * (self.direction || 1);
				boost.kill();
				boost = gsap.timeline()
					.to(loop, { timeScale: speed, duration: 0.15, ease: 'power1.out' })
					.to(loop, { timeScale: Math.sign(speed), duration: 1.2, ease: 'power2.out' });
			},
		});
	});
}

function initStory() {
	const statement = $('[data-scrub-words]');
	if (!statement) return;
	const words = splitWords(statement, 'plain');
	gsap.to(words, {
		opacity: 1,
		stagger: 0.1,
		ease: 'none',
		scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 48%', scrub: true },
	});
}

function initCut() {
	const stage = $('[data-cut-stage]');
	if (!stage) return;
	const img = $('[data-cut-img]', stage);
	const caption = $('[data-cut-caption]', stage);
	const [left, right] = $$('[data-cut-word]', stage);

	gsap.set(stage, { '--p': 0 });
	gsap.set(caption, { opacity: 0, y: 30 });

	gsap.timeline({
		scrollTrigger: { trigger: stage, start: 'top top', end: '+=160%', scrub: 0.6, pin: true, anticipatePin: 1 },
	})
		.to(stage, { '--p': 1, ease: 'power2.inOut', duration: 1 }, 0)
		.fromTo(img, { scale: 1.4 }, { scale: 1, ease: 'power2.out', duration: 1 }, 0)
		.to(left, { xPercent: -60, opacity: 0, ease: 'power2.in', duration: 0.7 }, 0)
		.to(right, { xPercent: 60, opacity: 0, ease: 'power2.in', duration: 0.7 }, 0)
		.to(caption, { opacity: 1, y: 0, ease: 'power3.out', duration: 0.3 }, 0.72);
}

function initSignatures() {
	const section = $('[data-sig]');
	const pin = $('[data-sig-pin]');
	const track = $('[data-sig-track]');
	const viewport = $('[data-sig-viewport]');
	const progress = $('[data-sig-progress]');
	if (!section || !pin || !track || !viewport) return;

	const mm = gsap.matchMedia();

	mm.add(desktop, () => {
		section.classList.add('is-pinned');
		const distance = () => track.scrollWidth - viewport.clientWidth + parseFloat(getComputedStyle(viewport).paddingLeft) * 2;

		const scroll = gsap.to(track, {
			x: () => -distance(),
			ease: 'none',
			scrollTrigger: {
				trigger: pin,
				start: 'top top',
				end: () => `+=${distance()}`,
				pin: true,
				scrub: 0.8,
				invalidateOnRefresh: true,
				anticipatePin: 1,
				onUpdate: (self) => progress && gsap.set(progress, { scaleX: self.progress }),
			},
		});

		$$('[data-sig-img]', track).forEach((img) => {
			gsap.fromTo(
				img,
				{ xPercent: -7 },
				{
					xPercent: 7,
					ease: 'none',
					scrollTrigger: {
						trigger: img.closest('.sig__card'),
						containerAnimation: scroll,
						start: 'left right',
						end: 'right left',
						scrub: true,
					},
				},
			);
		});

		return () => section.classList.remove('is-pinned');
	});

	mm.add('(max-width: 860px)', () => {
		const update = () => {
			const max = viewport.scrollWidth - viewport.clientWidth;
			if (progress) progress.style.transform = `scaleX(${max > 0 ? viewport.scrollLeft / max : 0})`;
		};
		viewport.addEventListener('scroll', update, { passive: true });
		update();
		return () => viewport.removeEventListener('scroll', update);
	});
}

function initParallax() {
	$$('[data-parallax]').forEach((wrap) => {
		const img = $('img', wrap);
		if (!img) return;
		gsap.fromTo(
			img,
			{ yPercent: -7 },
			{ yPercent: 7, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } },
		);
	});
}

function initFooter() {
	const mark = $('[data-footer-mark]');
	if (!mark) return;
	const parts = $$('.footer__word, .footer__slash', mark);
	gsap.fromTo(
		parts,
		{ yPercent: 70, opacity: 0 },
		{
			yPercent: 0,
			opacity: 1,
			stagger: 0.12,
			ease: 'power3.out',
			scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
		},
	);
}

function initCursor() {
	if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
	const cursor = $('.cursor');
	const label = $('.cursor__label');
	if (!cursor || !label) return;

	const x = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
	const y = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });

	window.addEventListener('pointermove', (event) => {
		x(event.clientX);
		y(event.clientY);
		cursor.classList.remove('is-hidden');
	});
	document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));

	document.addEventListener('pointerover', (event) => {
		const el = event.target as HTMLElement;
		const labelled = el.closest<HTMLElement>('[data-cursor]');
		const interactive = el.closest('a, button');
		cursor.classList.toggle('is-label', !!labelled);
		cursor.classList.toggle('is-hover', !labelled && !!interactive);
		if (labelled) label.textContent = labelled.dataset.cursor ?? '';
	});
}

function initMagnetic() {
	if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
	$$('[data-magnetic]').forEach((el) => {
		const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
		const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
		el.addEventListener('pointermove', (event) => {
			const r = el.getBoundingClientRect();
			x((event.clientX - r.left - r.width / 2) * 0.28);
			y((event.clientY - r.top - r.height / 2) * 0.38);
		});
		el.addEventListener('pointerleave', () => {
			gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: true });
		});
	});
}
