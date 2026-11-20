/**
 * Everything that moves on scroll. Loaded by main.ts once the page has painted, and booted
 * one feature per task so no single task holds the main thread for long.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { splitWords } from './split';
import { initMenu } from './menu';

gsap.registerPlugin(ScrollTrigger);

export interface MotionApi {
	lenis: Lenis | null;
	scrollTo: (target: HTMLElement | 0) => void;
}

const html = document.documentElement;
const desktop = '(min-width: 861px)';
const fine = '(hover: hover) and (pointer: fine)';
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/** Hands the main thread back between features (scheduler.yield where supported). */
const breathe = () =>
	new Promise<void>((resolve) => {
		const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
		if (s?.yield) s.yield().then(resolve);
		else setTimeout(resolve, 0);
	});

export async function boot(): Promise<MotionApi> {
	const motion = !html.classList.contains('reduced');
	let lenis: Lenis | null = null;

	const scrollTo = (target: HTMLElement | 0) => {
		const offset = target === 0 ? 0 : parseFloat(getComputedStyle(target).scrollMarginTop) || 88;
		const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
		if (lenis) lenis.scrollTo(top, { duration: 1.4 });
		else window.scrollTo({ top });
	};

	initMenu({ motion, onLayoutChange: () => ScrollTrigger.refresh(), scrollTo });
	if (!motion) return { lenis, scrollTo };

	lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((time) => lenis?.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);

	const inits: (() => void | Promise<void>)[] = [
		initHero,
		initReveals,
		initMarquees,
		initStory,
		initCut,
		initSignatures,
		initParallax,
		initFooter,
		initCursor,
		initMagnetic,
		initTilt,
		initCounters,
		initStars,
	];
	for (const init of inits) {
		await init();
		await breathe();
	}

	await document.fonts?.ready;
	ScrollTrigger.refresh();
	// A shared link like /#menu travels there once the pins have their real height.
	const shared = document.getElementById(decodeURIComponent((window.__serranosHash ?? '').slice(1)));
	if (shared) requestAnimationFrame(() => scrollTo(shared));

	return { lenis, scrollTo };
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

async function initReveals() {
	// All DOM writes first, then the triggers (which measure layout) in small chunks.
	// Interleaving the two forced a fresh layout per heading: one long task on phones.
	const headings = $$('[data-reveal="lines"]').map((el) => ({ el, words: splitWords(el) }));
	// Each word stands up off its baseline, hinged at the bottom like a card flipped onto the table.
	headings.forEach(({ words }) =>
		gsap.set(words, { yPercent: 115, rotationX: -88, transformPerspective: 700, transformOrigin: '50% 100% -0.3em' }),
	);
	await breathe();

	for (const [i, { el, words }] of headings.entries()) {
		gsap.to(words, {
			yPercent: 0,
			rotationX: 0,
			duration: 1.3,
			stagger: 0.06,
			ease: 'expo.out',
			scrollTrigger: { trigger: el, start: 'top 88%', once: true },
		});
		if (i % 2 === 1) await breathe();
	}

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
	const [first, second] = $$('.footer__word', mark);
	const slash = $('.footer__slash', mark);
	const tl = gsap.timeline({
		scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
	});
	// The words stand up off their baseline in 3D.
	const stand = { yPercent: 70, rotationX: -75, opacity: 0, transformPerspective: 900, transformOrigin: '50% 100%' };
	const stood = { yPercent: 0, rotationX: 0, opacity: 1, ease: 'power3.out' };
	tl.fromTo(first, stand, stood, 0).fromTo(second, stand, stood, 0.24);
	// The slash keeps its own centre pivot and 25° lean (a bottom pivot would push it out of the footer).
	if (slash) tl.fromTo(slash, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power3.out' }, 0.12);
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
		// The nav sits under the cursor layer, so the blob would cover its buttons.
		// Step aside there and let the buttons' own hover states do the talking.
		const off = !!el.closest('[data-nav], [data-actionbar]');
		cursor.classList.toggle('is-off', off);
		if (off) {
			cursor.classList.remove('is-label', 'is-hover');
			return;
		}
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

/**
 * Cards marked [data-tilt] lean toward the pointer in 3D and catch a highlight where it sits.
 * JS only eases two custom properties; the CSS turns them into a transform on the compositor.
 */
function initTilt() {
	if (!window.matchMedia(fine).matches) return;
	$$('[data-tilt]').forEach((el) => {
		const max = Number(el.dataset.tilt) || 10;
		const rx = gsap.quickTo(el, '--rx', { duration: 0.7, ease: 'power3.out' });
		const ry = gsap.quickTo(el, '--ry', { duration: 0.7, ease: 'power3.out' });
		el.addEventListener('pointermove', (event) => {
			const r = el.getBoundingClientRect();
			const px = (event.clientX - r.left) / r.width;
			const py = (event.clientY - r.top) / r.height;
			ry((px - 0.5) * 2 * max);
			rx((0.5 - py) * 2 * max);
			el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
			el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
			el.classList.add('is-tilting');
		});
		el.addEventListener('pointerleave', () => {
			rx(0);
			ry(0);
			el.classList.remove('is-tilting');
		});
	});
}

/** Numbers count up the first time they scroll in. The HTML already holds the final value. */
function initCounters() {
	$$('[data-count]').forEach((el) => {
		const end = parseFloat(el.dataset.count ?? '');
		if (Number.isNaN(end)) return;
		const decimals = (el.dataset.count!.split('.')[1] ?? '').length;
		const state = { v: 0 };
		el.textContent = (0).toFixed(decimals);
		gsap.to(state, {
			v: end,
			duration: 1.8,
			ease: 'expo.out',
			scrollTrigger: { trigger: el, start: 'top 92%', once: true },
			onUpdate: () => {
				el.textContent = state.v.toFixed(decimals);
			},
		});
	});
}

/** Star rows fill left to right to their rating. */
function initStars() {
	$$('[data-stars]').forEach((el) => {
		const fill = getComputedStyle(el).getPropertyValue('--fill').trim();
		gsap.fromTo(
			el,
			{ '--fill': '0%' },
			{ '--fill': fill, duration: 1.6, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 92%', once: true } },
		);
	});
}
