<script>
  import { onMount, onDestroy } from 'svelte';
  import { WebGLBackground } from './scene.js';

  let container;
  let bg;

  onMount(() => {
    if (container) {
      bg = new WebGLBackground(container);
      bg.init();
    }
  });

  onDestroy(() => {
    if (bg) {
      bg.destroy();
    }
  });
</script>

<div bind:this={container} style="position: fixed; inset: 0; z-index: -1;"></div>
