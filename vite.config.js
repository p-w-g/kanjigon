import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			// injectManifest lets Workbox precache EVERYTHING built by Vite,
			// including your kanji JSON data, so the whole app works with zero
			// network access after the very first load.
			strategies: 'generateSW',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
				// cache-first for our own data/assets since kanji data never changes
				// between deploys — no need to hit the network at all offline.
				runtimeCaching: []
			},
			includeAssets: ['favicon.svg', 'icons/*.png'],
			manifest: {
				name: 'Kanji Flash — Offline Flashcards',
				short_name: 'KanjiFlash',
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
				// Off: generateSW's dev mode tries to precache from a dev-dist
				// directory Vite never actually writes files into, which just
				// produces console noise (empty-glob warning, 404s) with no
				// real SW behavior. Offline behavior is verified for real via
				// `npm run build && npm run test:e2e` instead.
				enabled: false
			}
		})
	]
});
