<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { WebGLBackground } from './scene.js';

const container = ref(null);
let bg = null;

onMounted(() => {
  if (container.value) {
    bg = new WebGLBackground(container.value);
    bg.init();
  }
});

onUnmounted(() => {
  if (bg) {
    bg.destroy();
  }
});
</script>

<template>
  <div ref="container" class="webgl-background"></div>
</template>

<style scoped>
.webgl-background {
  position: fixed;
  inset: 0;
  z-index: -1;
}
</style>
