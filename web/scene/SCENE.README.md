# WebGLBackground Scene Module

## Overview
`WebGLBackground` is a self-contained Three.js module that renders the "Flowing Gradient" effect using custom WebGL2 shaders. It handles scene lifecycle, responsive resizing, and mouse interaction.

## Dependencies
- `three` (v128+)

## Installation
Ensure three.js is installed in your project:
```bash
npm install three
```

## Usage

### Basic Initialization
```javascript
import { WebGLBackground } from './scene/scene.js';

// 1. Instantiate with a container element
const bg = new WebGLBackground('#canvas-container');

// 2. Initialize the scene
bg.init();

// ... later ...

// 3. Clean up when component unmounts
bg.destroy();
```

### React Integration Example
```javascript
import { useEffect, useRef } from 'react';
import { WebGLBackground } from '../scene/scene';

export default function Background() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize
        const bg = new WebGLBackground(containerRef.current);
        bg.init();

        // Cleanup
        return () => {
            bg.destroy();
        };
    }, []);

    return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: -1 }} />;
}
```

## API Documentation

### `constructor(container, options)`
Creates a new instance.
- **`container`** *(HTMLElement | String)*: The DOM element (or selector) where the canvas will be appended.
- **`options`** *(Object)*: Optional configuration (reserved for future use).

### `init()`
Sets up the WebGL context, shaders, and event listeners. Starts the animation loop.

### `destroy()`
Stops the animation loop, removes event listeners, disposes of Three.js resources (geometries, materials, renderer), and removes the canvas from the DOM.

### `resize()`
Manually triggers a resize calculation. The module automatically listens to window resize events, but you can call this manually if the container changes size programmatically.

## Performance
- **Target FPS**: 60fps
- **Monitoring**: The scene logs the average FPS to the console every 2 seconds.
- **Optimization**: Uses `THREE.RawShaderMaterial` to minimize overhead and `orthographic` camera for simple 2D rendering.

## Interaction
- **Mouse Tracking**: Automatically attaches `mousemove` listeners to the `window` to track cursor position.
- **Hover**: Blobs are attracted to the cursor position, with a smooth ease-in/out effect.

