<script>
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import '../app.css';

	onMount(() => {
		// No UI tied to this — offline caching works the moment the SW takes
		// over, nothing for the user to see or act on.
		registerSW({ immediate: true });
	});
</script>

<slot />
