import { site, formatTime, type Day } from '../data/site';

const days: Day[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMinutes = (hhmm: string) => {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
};

/** Current weekday index (0 = Sunday) and minutes past midnight, in the cafe's timezone. */
function nowInCafe() {
	const parts = new Intl.DateTimeFormat('en-AU', {
		timeZone: site.timezone,
		weekday: 'long',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(new Date());
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return {
		day: days.indexOf(get('weekday') as Day),
		minutes: Number(get('hour')) * 60 + Number(get('minute')),
	};
}

function describe() {
	const { day, minutes } = nowInCafe();
	const hoursFor = (d: number) => site.hours.find((h) => h.day === days[d]);
	const today = hoursFor(day);

	if (today?.open) {
		const open = toMinutes(today.open);
		const close = toMinutes(today.close);
		if (minutes >= open && minutes < close) {
			const soon = close - minutes <= 45;
			return { state: 'open', day, text: soon ? `Closing soon · ${formatTime(today.close)}` : `Open now · until ${formatTime(today.close)}` };
		}
		if (minutes < open) return { state: 'closed', day, text: `Closed · opens ${formatTime(today.open)} today` };
	}

	for (let step = 1; step <= 7; step++) {
		const next = hoursFor((day + step) % 7);
		if (next?.open) {
			const when = step === 1 ? 'tomorrow' : next.day.slice(0, 3);
			return { state: 'closed', day, text: `Closed · opens ${when} ${formatTime(next.open)}` };
		}
	}
	return { state: 'closed', day, text: 'Closed' };
}

export function initOpenStatus() {
	const update = () => {
		const status = describe();
		document.querySelectorAll<HTMLElement>('[data-open-label]').forEach((el) => (el.textContent = status.text));
		document.querySelectorAll<HTMLElement>('[data-open-dot]').forEach((el) => (el.dataset.state = status.state));
		document.querySelectorAll<HTMLElement>('tr[data-day]').forEach((row) => {
			row.classList.toggle('is-today', Number(row.dataset.day) === status.day);
		});
	};
	update();
	window.setInterval(update, 60_000);
}
