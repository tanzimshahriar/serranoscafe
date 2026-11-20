/**
 * Page side of the 3D bean layer. It measures the hero, forwards pointer and scroll, and picks
 * where the scene (beans-scene.ts) runs:
 *
 * 1. In a worker on an OffscreenCanvas (Chrome, Edge, Firefox, Safari 17+): no main-thread cost.
 * 2. On the page itself, when the worker can't get WebGL2 (Safari 16.x, older Firefox).
 *
 * If there is no real GPU at all, the scene declines and the hero stays static.
 */
import type { FromScene, Layout, ToScene, Wall } from './beans-scene';

const RAD = (25 * Math.PI) / 180; // the logo's slash
/** Phones: how far the photo's top edge rises across the screen (--rise: 36vw in Hero.astro). */
const RISE = 0.36;

export function mountBeans(host: HTMLElement) {
	const still = document.documentElement.classList.contains('reduced');
	const media = host.querySelector<HTMLElement>('[data-hero-media]');
	const edge = host.querySelector<HTMLElement>('[data-hero-edge]');

	// Offsets, not rects: they ignore the intro and scroll-out transforms on these elements.
	const measure = (): Layout => {
		const W = host.clientWidth;
		const H = host.clientHeight;
		const walls: Wall[] = [];
		let slash: Layout['slash'] = null;
		let floor = H;
		let spawn: Layout['spawn'] = [0, W];
		if (W >= 861 || !media) {
			// The drawn slash: it meets the top 63% across (less its 14px offset from the photo) and
			// leans back by 25°. As the hero scrolls away it slides left by 12% of the width, matching
			// the cut's --cut-scroll in motion.ts. Beans bounce back onto the dark side.
			slash = { x: W * 0.63 - (edge ? 14 : 0), drift: W * 0.12, angle: RAD };
		} else {
			// Phones: the photo fills the bottom of the screen under a slanted top edge. Beans fall
			// behind the wordmark, hit that edge and skip down it, off the left of the screen.
			const rise = window.innerWidth * RISE;
			const top = media.offsetTop;
			const left = media.offsetLeft;
			const w = media.offsetWidth;
			const len = Math.hypot(w, rise);
			walls.push([left, top + rise, -rise / len, -w / len]);
			floor = top + media.offsetHeight;
			spawn = [W * 0.3, W];
		}
		return {
			W,
			H,
			// Sharp on retina phones too; the scene drops resolution itself if frames get slow.
			dpr: Math.min(window.devicePixelRatio || 1, 2),
			viewH: window.innerHeight,
			slash,
			walls,
			boxes: [],
			floor,
			spawn,
		};
	};

	/* ------------------------------------------------------------ wiring */

	let canvas: HTMLCanvasElement | null = null;
	let worker: Worker | null = null;
	let send: (msg: ToScene) => void = () => {};
	let visible = false;

	const fresh = () => {
		canvas?.remove();
		const c = document.createElement('canvas');
		c.className = 'beans';
		c.setAttribute('aria-hidden', 'true');
		host.prepend(c);
		return (canvas = c);
	};

	const teardown = () => {
		worker?.terminate();
		worker = null;
		canvas?.remove();
		canvas = null;
		send = () => {};
	};

	/** Bring a newly started scene up to date with the page. */
	const sync = () => {
		send({ type: 'scroll', y: window.scrollY });
		send({ type: 'run', on: visible && !document.hidden });
	};

	const receive = (msg: FromScene) => {
		if (msg.type === 'ready') {
			const c = canvas;
			requestAnimationFrame(() => c?.classList.add('is-on'));
		} else if (msg.type === 'frame') {
			requestAnimationFrame(() => send({ type: 'tick' }));
		} else if (msg.type === 'fail') {
			const retry = msg.reason === 'unsupported' && worker !== null;
			teardown();
			if (retry) onPage();
		}
	};

	const onPage = () =>
		import('./beans-scene')
			.then(({ createScene }) => {
				const c = fresh();
				const scene = createScene(c, measure(), still, {
					post: receive,
					raf: (cb) => requestAnimationFrame(cb),
					cancel: (id) => cancelAnimationFrame(id),
				});
				if (typeof scene === 'string') return teardown();
				send = (msg) => scene.handle(msg as Exclude<ToScene, { type: 'init' }>);
				sync();
			})
			.catch(teardown);

	if ('transferControlToOffscreen' in HTMLCanvasElement.prototype && typeof Worker !== 'undefined') {
		try {
			const c = fresh();
			const offscreen = c.transferControlToOffscreen();
			const w = new Worker(new URL('./beans-worker.ts', import.meta.url), { type: 'module' });
			worker = w;
			w.onmessage = (event: MessageEvent<FromScene>) => receive(event.data);
			// A browser that can't run module workers lands here: run on the page instead.
			w.onerror = () => receive({ type: 'fail', reason: 'unsupported' });
			send = (msg) => w.postMessage(msg);
			w.postMessage({ type: 'init', canvas: offscreen, layout: measure(), still } satisfies ToScene, [offscreen]);
			sync();
		} catch {
			teardown();
			onPage();
		}
	} else {
		onPage();
	}

	/* ------------------------------------------------------------ events */

	let frame = 0;
	new ResizeObserver(() => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => send({ type: 'layout', layout: measure() }));
	}).observe(host);

	if (still) return;

	// Only simulate and render while the hero is on screen and the tab is visible.
	const run = () => send({ type: 'run', on: visible && !document.hidden });
	new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		run();
	}).observe(host);
	document.addEventListener('visibilitychange', run);

	const local = (e: PointerEvent) => {
		const r = host.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	};
	host.addEventListener('pointermove', (e) => send({ type: 'pointer', ...local(e), inside: true }), { passive: true });
	host.addEventListener('pointerleave', () => send({ type: 'pointer', x: 0, y: 0, inside: false }), { passive: true });
	host.addEventListener('pointerdown', (e) => send({ type: 'tap', ...local(e) }), { passive: true });
	// The slash slides as the hero scrolls away; the scene moves its wall to match.
	window.addEventListener('scroll', () => send({ type: 'scroll', y: window.scrollY }), { passive: true });
}
