import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// SPA fallback for non-prerendered routes (session pages), named 200.html
			// (not index.html) so it doesn't clobber the prerendered root page
			fallback: '200.html',
			precompress: false,
			strict: true
		}),
		prerender: {
			// so canonical/OG URLs baked in at build time point at the real
			// domain instead of SvelteKit's http://sveltekit-prerender placeholder
			origin: 'https://kanjigon.netlify.app'
		}
	}
};

export default config;
