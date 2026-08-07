<script>
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import '../app.css';

	const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	onMount(async () => {
		// No UI tied to this — offline caching works the moment the SW takes
		// over, nothing for the user to see or act on.
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}
	});
</script>

<svelte:head>
	{@html webManifestLink}
</svelte:head>

<slot />
