# Integration Guide

## Package Contents

| File | Description |
|------|-------------|
| `scene/scene.js` | Core module (ESM). Contains the WebGL logic and shaders. |
| `scene/embed.html` | Vanilla JS integration example. |
| `scene/embed.jsx` | React component wrapper. |
| `scene/embed.vue` | Vue 3 component wrapper. |
| `scene/embed.svelte` | Svelte component wrapper. |
| `scene/fallback.html` | CSS/HTML fallback for non-WebGL devices. |
| `scene/webgl-background.min.js` | Production bundle (Minified). |

## 1. Quick Start

### Installation
Ensure `three.js` is installed in your project:
```bash
npm install three
```
*Note: The module uses `three` as a peer dependency to keep the bundle size small (< 20kb).*

### React
Copy `embed.jsx` to your components folder.
```jsx
import WebGLBackgroundEmbed from './components/WebGLBackgroundEmbed';

function App() {
  return (
    <div className="app">
      <WebGLBackgroundEmbed />
      <main>Your content here...</main>
    </div>
  );
}
```

### Vanilla JS
```html
<script type="importmap">
  { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
</script>
<script type="module">
  import { WebGLBackground } from './scene.js';
  const bg = new WebGLBackground(document.body);
  bg.init();
</script>
```

## 2. Configuration

The `WebGLBackground` class accepts an options object (currently reserved for future use).
Uniforms are currently hardcoded to the specific brand palette but can be modified in `scene.js`.

## 3. Troubleshooting

### Blank Canvas?
- Check if the container has `width/height`.
- Ensure `zIndex` is correct (should be negative if used as background).
- Check console for "WebGL context creation failed". If so, use the fallback.

### "Module not found: three"
- Ensure your project is set up to resolve node_modules or use an import map.

### Performance Issues
- The shader automatically adjusts quality based on compile-time definitions.
- Mobile devices run a generic "FAST" path if configured (requires recompiling defined in shader source).

## 4. Browser Support

- **Desktop**: Chrome, Firefox, Safari (WebGL 2.0 supported).
- **Mobile**: iOS 15+, Android 8+ (WebGL 2.0 supported).
- **Fallback**: Use `fallback.html` CSS for IE11 or older devices.
