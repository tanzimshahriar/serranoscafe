/**
 * Ratings and words from guests.
 *
 * IMPORTANT: check `platforms` against the live listings before launch, then update
 * them every few months. The Google figure below came from a third-party aggregator
 * (magicpin, "4.6 from 172 online ratings"), not from Google itself. Open your Google
 * Business Profile and copy the real star rating and review count into it.
 *
 * `quotes` are real, published words about the cafe, credited to where they appeared.
 * Swap in your favourite Google reviews (with the reviewer's first name) whenever you like.
 */

import { site } from './site';

export interface Platform {
	id: 'google' | 'ubereats' | 'facebook';
	name: string;
	/** Out of 5. For Facebook's "% recommend", use `percent` instead. */
	value?: number;
	percent?: number;
	count: string;
	href: string;
	cta: string;
}

export const platforms: Platform[] = [
	{
		id: 'google',
		name: 'Google',
		value: 4.6,
		count: '170+',
		href: site.mapsUrl,
		cta: 'Read & write a Google review',
	},
	{
		id: 'ubereats',
		name: 'Uber Eats',
		value: Number(site.rating.value),
		count: site.rating.count,
		href: site.links.uberEats,
		cta: 'Order & rate on Uber Eats',
	},
	{
		id: 'facebook',
		name: 'Facebook',
		percent: 94,
		count: '27',
		href: `${site.links.facebook}reviews`,
		cta: 'Recommend us on Facebook',
	},
];

export const google = platforms[0];

export interface Quote {
	text: string;
	who: string;
	where: string;
	/** Short tag shown above the quote. */
	about: string;
}

export const quotes: Quote[] = [
	{
		text: 'Portions are generous, service is cheerful.',
		who: 'Bluestone neighbourhood guide',
		where: 'Satterley',
		about: 'Portions',
	},
	{
		text: 'Great food, decent serving. Good customer service. Have been here a few times.',
		who: 'Community review',
		where: 'Atly',
		about: 'Regulars',
	},
	{
		text: 'Great service. Despite the menu not showing anything for lunch being gluten free, they went out of their way to check the ingredients.',
		who: 'Gluten-free diner',
		where: 'Atly',
		about: 'Gluten-free',
	},
	{
		text: 'The food is generally very good in quality — nice and bright inside.',
		who: "Howie's Melbourne Food",
		where: 'Blog review',
		about: 'The room',
	},
	{
		text: 'There was never a long wait, making it convenient for families.',
		who: 'Community review',
		where: 'Atly',
		about: 'Families',
	},
];
