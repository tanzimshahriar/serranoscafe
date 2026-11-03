/**
 * The menu. Prices are in AUD. To change the menu, edit this file — the menu section,
 * the signature dishes and the Google structured data all read from it.
 *
 * Dietary tags: V = vegetarian, GFO = gluten-free option available.
 * `photo` must match a key in src/data/photos.ts.
 */

export type Tag = 'V' | 'GFO';

export interface MenuItem {
	name: string;
	price: number;
	/** Shown instead of the bare price, e.g. "from". */
	pricePrefix?: string;
	description?: string;
	tags?: Tag[];
	badge?: string;
	photo?: string;
}

export interface MenuSection {
	id: string;
	title: string;
	kicker: string;
	/** Set false for sections the dietary filters should leave alone (e.g. drinks). */
	filterable?: boolean;
	items: MenuItem[];
}

export const tagLabels: Record<Tag, string> = {
	V: 'Vegetarian',
	GFO: 'Gluten-free option',
};

export const menu: MenuSection[] = [
	{
		id: 'brekkie',
		title: 'Brekkie',
		kicker: 'Eggs, every which way',
		items: [
			{
				name: 'Big Breakfast',
				price: 33,
				description:
					'Eggs your way, avocado, tomato, mushrooms, turkey bacon, sausage, hash browns and two slices of toast.',
				badge: 'Most loved',
			},
			{
				name: 'Eggs Benny',
				price: 29,
				description: 'Two poached eggs on sourdough with slow-cooked beef brisket and hollandaise.',
				badge: 'Brisket',
			},
			{
				name: 'Shakshuka',
				price: 29,
				description: 'Eggs baked in a spiced tomato and pepper sauce with sujuk, feta and toast.',
				tags: ['GFO'],
			},
			{
				name: 'Smashed Avo',
				price: 29,
				description: 'Poached eggs on sourdough, smashed avocado, crumbled feta and dukkah.',
				tags: ['V', 'GFO'],
				photo: 'smashedAvo',
			},
			{
				name: 'Chilli Eggs',
				price: 24,
				description:
					"Chilli scrambled eggs, goat's cheese, roasted cherry tomatoes, pickled chilli and house chilli oil on Turkish bread.",
				tags: ['V', 'GFO'],
			},
			{
				name: 'Breaky Burger',
				price: 23,
				description: 'Crispy turkey bacon, a fried egg, hash brown and cheese on a brioche bun.',
				tags: ['GFO'],
				badge: 'Fan favourite',
			},
			{
				name: 'Atlantic Salmon',
				price: 30,
				description: 'Smoked salmon and poached eggs on sourdough with asparagus and hollandaise.',
			},
			{
				name: 'Veggie Breakfast',
				price: 30,
				description: 'Eggs your way, avocado, mushroom, tomato, spinach and hash browns with sourdough.',
				tags: ['V', 'GFO'],
			},
			{
				name: 'Omelette',
				price: 25,
				description: 'Cheese, spinach, mushroom, tomato and Spanish onion, with sourdough toast.',
				tags: ['V'],
			},
			{
				name: 'Toast',
				price: 11,
				description: 'Your choice of bread with butter and spreads.',
				tags: ['V', 'GFO'],
			},
		],
	},
	{
		id: 'sweet',
		title: 'Sweet Side',
		kicker: 'Biscoff, Nutella, pistachio',
		items: [
			{
				name: 'Hotcakes',
				price: 25,
				description:
					'Buttermilk hotcakes, fresh berries and vanilla ice cream, finished with your pick of Biscoff, Nutella or pistachio.',
				tags: ['V'],
				badge: 'Pick your topping',
				photo: 'biscoffHotcakes',
			},
			{
				name: 'Biscoff French Toast',
				price: 25,
				description: 'Mascarpone, caramelised banana and vanilla ice cream under a pour of Biscoff sauce.',
				tags: ['V'],
			},
		],
	},
	{
		id: 'lunch',
		title: 'Burgers & Sandwiches',
		kicker: 'From the grill',
		items: [
			{
				name: 'Brisket Sandwich',
				price: 29,
				description: 'Slow-cooked beef brisket, served with fries and garlic aioli.',
				badge: 'House special',
			},
			{
				name: 'Smashed Beef Burger',
				price: 27,
				description: 'Halal beef, smashed thin on the flat-top.',
			},
			{
				name: 'Southern Fried Chicken Burger',
				price: 27,
				description: 'Crunchy Southern-fried chicken in a toasted bun.',
			},
			{
				name: 'Veggie Burger',
				price: 25,
				description: 'The meat-free stack.',
				tags: ['V'],
			},
		],
	},
	{
		id: 'salads',
		title: 'Salads',
		kicker: 'Lighter, not smaller',
		items: [
			{
				name: 'Grilled Chicken Salad',
				price: 27,
				description: 'Grilled chicken, cauliflower, chickpeas and pomegranate with a lemon and herb dressing.',
			},
			{
				name: 'Salt & Pepper Calamari',
				price: 28,
				description: 'With Greek salad, fries and tartare sauce.',
			},
		],
	},
	{
		id: 'classics',
		title: 'Old School Favourites',
		kicker: 'The pub classics, halal',
		items: [
			{ name: 'Chicken Parma', price: 29, description: 'The Aussie classic — crumbed, sauced and melted.' },
			{ name: 'Chicken Schnitzel', price: 29, description: 'Golden crumbed chicken breast.' },
			{ name: 'Porterhouse Steak', price: 40, description: 'Halal porterhouse, cooked to your liking.' },
		],
	},
	{
		id: 'kids',
		title: 'Little Ones',
		kicker: 'For the small and hungry',
		items: [
			{ name: 'Kids Pancakes', price: 16, description: 'With maple syrup and ice cream.', tags: ['V'] },
			{ name: 'Kids Nuggets & Chips', price: 16 },
			{ name: 'Kids Breakfast', price: 16 },
		],
	},
	{
		id: 'sides',
		title: 'Sides & Extras',
		kicker: 'Make it yours',
		items: [
			{ name: 'Bowl of Wedges', price: 17, tags: ['V'] },
			{ name: 'Bowl of Fries', price: 14, tags: ['V'] },
			{ name: 'Turkey Bacon', price: 6 },
			{ name: 'Hash Brown', price: 5, tags: ['V'] },
			{ name: 'Hollandaise', price: 4.5, tags: ['V'] },
			{ name: 'Extra Egg', price: 4, tags: ['V'] },
			{ name: 'Bread', price: 3.5, tags: ['V'] },
		],
	},
	{
		id: 'drinks',
		title: 'Drinks',
		kicker: 'Hot, iced and blended',
		filterable: false,
		items: [
			{
				name: 'Coffee',
				price: 6.5,
				description: 'Specialty espresso on Roasting Warehouse beans.',
			},
			{ name: 'Tea', price: 5.5 },
			{ name: 'Iced Coffee', price: 9 },
			{
				name: 'Oat Maple Iced Latte',
				price: 12,
				description: 'Espresso, oat milk and maple over ice.',
				badge: 'New',
				photo: 'oatMapleLatte',
			},
			{
				name: 'Banana Iced Chocolate',
				price: 12,
				description:
					'Banana syrup, milk and chocolate over ice, crowned with banana cold foam and cocoa.',
				photo: 'bananaIcedChoc',
			},
			{ name: 'Iced Strawberry Matcha', price: 12 },
			{
				name: 'Smoothies',
				price: 12,
				description: 'Blended fresh fruit — ask what is in the fridge today.',
				photo: 'smoothies',
			},
			{ name: 'Mocktails', price: 12, description: 'Non-alcoholic, made with fresh fruit.' },
		],
	},
];

export const formatPrice = (price: number) => (Number.isInteger(price) ? `${price}` : price.toFixed(2));
