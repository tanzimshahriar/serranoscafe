import type { ImageMetadata } from 'astro';
import smashedAvo from '../assets/photos/smashed-avo.jpg';
import biscoffHotcakes from '../assets/photos/biscoff-hotcakes.jpg';
import smoothies from '../assets/photos/smoothies.jpg';
import oatMapleLatte from '../assets/photos/oat-maple-iced-latte.jpg';
import bananaIcedChoc from '../assets/photos/banana-iced-chocolate.jpg';
import coffeeBeans from '../assets/photos/coffee-beans.jpg';

export interface Photo {
	src: ImageMetadata;
	alt: string;
	/** CSS object-position, so crops keep the food in frame. */
	focus?: string;
}

export const photos = {
	smashedAvo: {
		src: smashedAvo,
		alt: 'Smashed avo on sourdough with poached eggs, feta, cucumber ribbons and a swipe of beetroot',
		focus: '50% 52%',
	},
	biscoffHotcakes: {
		src: biscoffHotcakes,
		alt: 'A stack of buttermilk hotcakes with Biscoff sauce, crumb, berries and a scoop of vanilla ice cream',
		focus: '50% 62%',
	},
	smoothies: {
		src: smoothies,
		alt: "Strawberry, banana and mango smoothies in Serranos Cafe branded cans on a marble counter",
		focus: '50% 55%',
	},
	oatMapleLatte: {
		src: oatMapleLatte,
		alt: 'Oat maple iced latte topped with cold foam and biscuit crumb',
		focus: '35% 60%',
	},
	bananaIcedChoc: {
		src: bananaIcedChoc,
		alt: 'Banana iced chocolate with banana cold foam and cocoa on a bronze marble table',
		focus: '50% 50%',
	},
	coffeeBeans: {
		src: coffeeBeans,
		alt: 'Bags of Roasting Warehouse coffee beans and coffee pods on the counter',
		focus: '50% 45%',
	},
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;
