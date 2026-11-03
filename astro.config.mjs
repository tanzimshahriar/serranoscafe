// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** @param {string} pkg @param {string} file */
const fontsource = (pkg, file) => `./node_modules/@fontsource/${pkg}/files/${file}`;

// https://astro.build/config
export default defineConfig({
	// Swap for the cafe's real domain before going live.
	site: 'https://serranoscafe.com.au',
	integrations: [sitemap()],
	// One page, small stylesheet: inline it and skip the render-blocking request.
	build: { inlineStylesheets: 'always' },
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Young Serif',
			cssVariable: '--font-display',
			fallbacks: ['Georgia', 'serif'],
			options: {
				variants: [
					{
						src: [fontsource('young-serif', 'young-serif-latin-400-normal.woff2')],
						weight: 400,
						style: 'normal',
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'Familjen Grotesk',
			cssVariable: '--font-body',
			fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
			options: {
				variants: [
					{
						src: [fontsource('familjen-grotesk', 'familjen-grotesk-latin-400-normal.woff2')],
						weight: 400,
						style: 'normal',
					},
					{
						src: [fontsource('familjen-grotesk', 'familjen-grotesk-latin-400-italic.woff2')],
						weight: 400,
						style: 'italic',
					},
					{
						src: [fontsource('familjen-grotesk', 'familjen-grotesk-latin-600-normal.woff2')],
						weight: 600,
						style: 'normal',
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'DM Mono',
			cssVariable: '--font-mono',
			fallbacks: ['ui-monospace', 'monospace'],
			options: {
				variants: [
					{
						src: [fontsource('dm-mono', 'dm-mono-latin-400-normal.woff2')],
						weight: 400,
						style: 'normal',
					},
				],
			},
		},
	],
});
