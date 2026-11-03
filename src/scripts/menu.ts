import { gsap } from 'gsap';

interface MenuOptions {
	motion: boolean;
	onLayoutChange: () => void;
	scrollTo: (target: HTMLElement) => void;
}

export function initMenu({ motion, onLayoutChange, scrollTo }: MenuOptions) {
	const root = document.querySelector<HTMLElement>('[data-menu]');
	if (!root) return;

	const sections = [...root.querySelectorAll<HTMLElement>('[data-menu-section]')];
	const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-menu-link]')];
	const index = root.querySelector<HTMLElement>('.menu__index');
	const counter = root.querySelector<HTMLElement>('[data-menu-num]');

	/* ---------------------------------------------------------- scrollspy */

	let current = '';
	const setActive = (id: string) => {
		if (id === current) return;
		current = id;
		const i = links.findIndex((link) => link.dataset.menuLink === id);
		links.forEach((link, j) => (j === i ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current')));

		const active = links[i];
		if (index && active && index.scrollWidth > index.clientWidth) {
			const target = active.offsetLeft - index.clientWidth / 2 + active.clientWidth / 2;
			index.scrollTo({ left: target, behavior: motion ? 'smooth' : 'auto' });
		}

		if (counter) {
			const next = String(i + 1).padStart(2, '0');
			if (!motion) {
				counter.textContent = next;
				return;
			}
			gsap.timeline()
				.to(counter, { yPercent: -40, opacity: 0, duration: 0.18, ease: 'power2.in' })
				.add(() => (counter.textContent = next))
				.fromTo(counter, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
		}
	};

	const spy = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) setActive((entry.target as HTMLElement).dataset.menuSection ?? '');
			});
		},
		{ rootMargin: '-35% 0px -60% 0px' },
	);
	sections.forEach((section) => spy.observe(section));

	/* ------------------------------------------------------------ filters */

	const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
	const status = root.querySelector<HTMLElement>('[data-filter-status]');
	const empty = root.querySelector<HTMLElement>('[data-menu-empty]');
	const items = [...root.querySelectorAll<HTMLElement>('.menu__item')];
	const list = root.querySelector<HTMLElement>('.menu__list');
	const dishes = items.filter((item) => !item.closest('[data-filterable="false"]'));
	const active = new Set<string>();

	const apply = () => {
		// Reading inside the list? Rows around you are about to collapse, so the results restart from the top.
		const inside = (list?.getBoundingClientRect().top ?? 0) < 0;
		let shown = 0;
		dishes.forEach((item) => {
			const tags = (item.dataset.tags ?? '').split(' ');
			const match = [...active].every((tag) => tags.includes(tag));
			item.hidden = !match;
			if (match) shown++;
		});

		sections.forEach((section) => {
			const visible = section.querySelectorAll('.menu__item:not([hidden])').length;
			section.hidden = visible === 0;
			const count = root.querySelector<HTMLElement>(`[data-count-for="${section.dataset.menuSection}"]`);
			if (count) count.textContent = String(visible);
			const link = links.find((l) => l.dataset.menuLink === section.dataset.menuSection);
			link?.parentElement?.toggleAttribute('hidden', visible === 0);
		});

		if (empty) empty.hidden = shown > 0;
		if (status) status.textContent = active.size ? `${shown} of ${dishes.length} dishes` : '';

		if (motion && active.size) {
			gsap.fromTo(
				root.querySelectorAll('.menu__item:not([hidden])'),
				{ opacity: 0, y: 12 },
				{ opacity: 1, y: 0, duration: 0.5, stagger: 0.015, ease: 'power3.out', overwrite: true },
			);
		}
		onLayoutChange();
		const first = sections.find((section) => !section.hidden);
		if (inside && first) scrollTo(first);
	};

	buttons.forEach((button) => {
		button.addEventListener('click', () => {
			const tag = button.dataset.filter ?? '';
			const on = !active.has(tag);
			on ? active.add(tag) : active.delete(tag);
			button.setAttribute('aria-pressed', String(on));
			apply();
		});
	});

	/* ------------------------------------------------- hover photo preview */

	const preview = root.querySelector<HTMLElement>('[data-menu-preview]');
	if (!preview || !motion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

	const frames = new Map(
		[...preview.querySelectorAll<HTMLElement>('[data-preview]')].map((el) => [el.dataset.preview ?? '', el]),
	);
	const moveX = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3.out' });
	const moveY = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3.out' });
	const tilt = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: 'power3.out' });
	let lastX = 0;
	let visible: HTMLElement | null = null;

	const show = (key?: string) => {
		const frame = key ? frames.get(key) : undefined;
		if (frame === visible) return;
		visible?.classList.remove('is-active');
		frame?.classList.add('is-active');
		visible = frame ?? null;
	};

	// The preview parks in the gap between the descriptions and the prices,
	// riding up and down with the pointer and drifting a little sideways.
	root.addEventListener('pointermove', (event) => {
		const w = preview.offsetWidth;
		const h = preview.offsetHeight;
		const bounds = list?.getBoundingClientRect();
		const anchor = bounds ? bounds.right - w - bounds.width * 0.12 : event.clientX + 32;
		const drift = bounds ? (event.clientX - (bounds.left + bounds.width / 2)) * 0.12 : 0;
		moveX(Math.min(anchor + drift, window.innerWidth - w - 16));
		moveY(event.clientY - h / 2);
		tilt(gsap.utils.clamp(-8, 8, (event.clientX - lastX) * 0.6));
		lastX = event.clientX;
	});

	items.forEach((item) => {
		if (!item.dataset.photo) return;
		item.addEventListener('pointerenter', () => show(item.dataset.photo));
		item.addEventListener('pointerleave', () => show());
	});
}
