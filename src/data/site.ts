/**
 * Everything about the business lives here. Change a phone number, an hour or an
 * ordering link in this file and the whole site (and its Google structured data) follows.
 */

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface Hours {
	day: Day;
	/** 24h "HH:MM", Melbourne time. Leave both empty for a closed day. */
	open: string;
	close: string;
}

export interface OrderChannel {
	id: string;
	label: string;
	kicker: string;
	detail: string;
	href: string;
	external: boolean;
}

export const site = {
	name: "Serranos Cafe",
	shortName: 'Serranos',
	description:
		"100% halal brunch, specialty coffee and sweet things in Tarneit Gardens. Slow-cooked brisket, sujuk shakshuka, Biscoff hotcakes and smoothies — dine in, pick up or get it delivered.",
	url: 'https://serranoscafe.com.au',

	phone: {
		display: '(03) 9731 6233',
		href: 'tel:+61397316233',
		e164: '+61397316233',
	},

	address: {
		centre: 'Tarneit Gardens Shopping Centre',
		street: '62 Wickford Road',
		suburb: 'Tarneit',
		state: 'VIC',
		postcode: '3029',
		country: 'AU',
	},

	geo: { lat: -37.8396098, lng: 144.6743993 },

	mapsUrl:
		'https://www.google.com/maps/search/?api=1&query=Serrano%27s+Cafe%2C+62+Wickford+Rd%2C+Tarneit+VIC+3029',

	timezone: 'Australia/Melbourne',

	hours: [
		{ day: 'Monday', open: '07:00', close: '16:00' },
		{ day: 'Tuesday', open: '07:00', close: '16:00' },
		{ day: 'Wednesday', open: '07:00', close: '16:00' },
		{ day: 'Thursday', open: '07:00', close: '16:00' },
		{ day: 'Friday', open: '07:00', close: '16:00' },
		{ day: 'Saturday', open: '07:30', close: '15:00' },
		{ day: 'Sunday', open: '08:00', close: '15:00' },
	] satisfies Hours[],

	links: {
		uberEats: 'https://www.ubereats.com/au/store/serranos-cafe/P3lz6QEGTqe2XYDMG8OSEw',
		/** Not listed yet. Paste the store URL here and a DoorDash tile appears automatically. */
		doorDash: '',
		instagram: 'https://www.instagram.com/serranoscafe/',
		instagramHandle: '@serranoscafe',
		facebook: 'https://www.facebook.com/SerranoscafeTarneit/',
	},

	rating: { value: '4.8', count: '700+', source: 'Uber Eats' },

	/** Shown in the footer. Put your studio name here when you hand it over. */
	credit: '',
};

export const orderChannels: OrderChannel[] = [
	{
		id: 'ubereats',
		label: 'Uber Eats',
		kicker: 'Delivery & pickup',
		detail: 'The whole menu, to your door or ready at the counter.',
		href: site.links.uberEats,
		external: true,
	},
	{
		id: 'doordash',
		label: 'DoorDash',
		kicker: 'Delivery',
		detail: 'Order through DoorDash.',
		href: site.links.doorDash,
		external: true,
	},
	{
		id: 'call',
		label: site.phone.display,
		kicker: 'Call ahead',
		detail: 'Ring the counter and we will have it ready when you walk in.',
		href: site.phone.href,
		external: false,
	},
	{
		id: 'visit',
		label: 'Pull up a chair',
		kicker: 'Dine in',
		detail: `${site.address.street}, ${site.address.suburb} — inside ${site.address.centre}.`,
		href: site.mapsUrl,
		external: true,
	},
].filter((channel) => channel.href);

export const formatTime = (hhmm: string) => {
	const [h, m] = hhmm.split(':').map(Number);
	const suffix = h >= 12 ? 'pm' : 'am';
	const hour = h % 12 || 12;
	return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
};
