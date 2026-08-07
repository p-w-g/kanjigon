import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			// generateSW precaches everything Workbox is told to glob, including
			// prerendered HTML and our kanji JSON data, so the whole app works
			// with zero network access after the very first load.
			strategies: 'generateSW',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
				// cache-first for our own data/assets since kanji data never changes
				// between deploys — no need to hit the network at all offline.
				runtimeCaching: []
			},
			includeAssets: ['favicon.svg', 'icons/*.png'],
			manifest: {
				name: 'Kanjigon — Offline Flashcards',
				short_name: 'Kanjigon',
				description: 'Offline-first kanji flashcards by school grade',
				theme_color: '#1a1a2e',
				background_color: '#1a1a2e',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'icons/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			devOptions: {
				// `vite dev` serves the app as hundreds of unbundled ES modules, so
				// Workbox has nothing meaningful to precache here — enabling this
				// used to just fail silently, but now that registration succeeds
				// it instead lets a real SW take over with an empty cache, which
				// hangs the page forever the moment the dev server goes away.
				// Real offline verification only happens against the production
				// build: `npm run build && npm run preview` (or `npm run test:e2e`).
				enabled: false
			}
		})
	]
});
