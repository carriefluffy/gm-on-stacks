# Flow Gradient Shader Suite

## Overview

This shader suite implements the "Flowing Gradient" background effect as specified in the [WebGL Design Specification](webgl_design_spec.md). It provides organic, liquid-like gradient animation with morphing geometry, custom rim lighting, and bloom-ready output.

---

## Files

| File | Target | Description |
|------|--------|-------------|
| `flow_gradient.vert` | WebGL2 (GLSL ES 3.00) | Vertex shader with morph displacement |
| `flow_gradient.frag` | WebGL2 (GLSL ES 3.00) | Fragment shader with full lighting model |
| `flow_gradient_webgl1.vert` | WebGL1 (GLSL ES 1.00) | Fallback vertex shader |
| `flow_gradient_webgl1.frag` | WebGL1 (GLSL ES 1.00) | Fallback fragment shader |

---

## Quality Variants

Define `QUALITY` before shader compilation:

```glsl
#define QUALITY 0  // FAST (mobile) - 3 FBM octaves, simplified lighting
#define QUALITY 1  // HQ (desktop) - 5 FBM octaves, full rim light + bloom
```

### Performance Comparison

| Feature | FAST (Mobile) | HQ (Desktop) |
|---------|---------------|--------------|
| FBM Octaves | 3 | 5 |
| Precision | mediump | highp |
| Rim Lighting | Simplified glow | Full Fresnel-like rim |
| Bloom | Hard threshold | Smooth falloff |
| Morph Waves | 1 | 3 |
| Target FPS | 30+ | 60 |

---

## Uniform Table

### Per-Frame Uniforms (update every `requestAnimationFrame`)

| Name | Type | Range | Default | Purpose |
|------|------|-------|---------|---------|
| `uTime` | `float` | 0.0 → ∞ | 0.0 | Animation timer in seconds. Increment by `deltaTime` each frame. |
| `uMorphAmount` | `float` | 0.0 – 1.0 | 0.5 | Controls vertex displacement intensity. Animate for pulsing effect. |
| `uHoverIntensity` | `float` | 0.0 – 1.0 | 0.0 | Mouse/touch interaction intensity. Lerp toward 1.0 on hover. |
| `uMouse` | `vec2` | (0,0) – (1,1) | (0.5, 0.5) | Normalized mouse position. Origin top-left. |
| `uMouseVelocity` | `vec2` | (-1,-1) – (1,1) | (0.0, 0.0) | Mouse velocity for trail effects (optional, reserved for future use). |

### Per-Resize Uniforms (update on viewport change)

| Name | Type | Range | Default | Purpose |
|------|------|-------|---------|---------|
| `uResolution` | `vec2` | Viewport size | (1280, 800) | Canvas dimensions in pixels. Used for aspect ratio correction. |

### Per-Material Uniforms (set once or on palette change)

| Name | Type | Default (Hex) | Default (RGB Normalized) | Purpose |
|------|------|---------------|--------------------------|---------|
| `uColor1` | `vec3` | `#6B21A8` | (0.42, 0.13, 0.66) | Primary color: Royal Purple |
| `uColor2` | `vec3` | `#DB2777` | (0.86, 0.15, 0.47) | Secondary color: Hot Magenta |
| `uColor3` | `vec3` | `#F97316` | (0.98, 0.45, 0.09) | Tertiary color: Peach Orange |

---

## Attributes

| Name | Type | Description |
|------|------|-------------|
| `a_position` | `vec2` | NDC quad positions: `(-1,-1)` to `(1,1)` |
| `a_uv` | `vec2` | UV coordinates: `(0,0)` to `(1,1)` |

---

## Varyings

| Name | Type | Description |
|------|------|-------------|
| `vUv` | `vec2` | Interpolated UV coordinates |
| `vPosition` | `vec2` | Morphed NDC position |
| `vMorphOffset` | `float` | Morph displacement magnitude (for fragment effects) |

---

## Precision Notes

| Operation | Required Precision | Justification |
|-----------|-------------------|---------------|
| Noise calculation | `highp` (HQ) / `mediump` (FAST) | Noise functions are sensitive to precision loss; banding visible with low precision. |
| UV/position math | `mediump` | Sufficient for screen-space coordinates. |
| Color mixing | `mediump` | Human eye cannot perceive small color precision errors. |
| Time accumulation | `highp` | Prevents animation stuttering after long runtime. |

---

## Blending Mode

**Required**: `gl.BLEND` disabled (opaque output).

The shader outputs full opacity (`alpha = 1.0`). No blending is needed for the background layer.

If using bloom post-processing, the `computeBloomContribution` output can be extracted to a separate render target for additive blending.

---

## Integration Example (React/TypeScript)

```typescript
// Mouse tracking state
let mouseX = 0.5;
let mouseY = 0.5;
let isHovered = false;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = (e.clientY - rect.top) / rect.height;
});

canvas.addEventListener('mouseenter', () => { isHovered = true; });
canvas.addEventListener('mouseleave', () => { isHovered = false; });

// Set uniforms each frame
gl.uniform1f(uTimeLocation, performance.now() * 0.001);
gl.uniform1f(uMorphAmountLocation, 0.5 + Math.sin(time * 0.5) * 0.2);
gl.uniform1f(uHoverIntensityLocation, lerpedHoverIntensity); // Lerp 0→1 over 200ms
gl.uniform2f(uMouseLocation, mouseX, mouseY);
gl.uniform2f(uMouseVelocityLocation, 0.0, 0.0); // Optional: compute velocity

// Set on resize
gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);

// Set once (or on theme change)
gl.uniform3f(uColor1Location, 0.42, 0.13, 0.66); // Royal Purple
gl.uniform3f(uColor2Location, 0.86, 0.15, 0.47); // Hot Magenta
gl.uniform3f(uColor3Location, 0.98, 0.45, 0.09); // Peach Orange
```

### Hover Intensity Lerping

```typescript
// Smooth transition for hover intensity
let targetHover = 0.0;
let currentHover = 0.0;
const LERP_SPEED = 0.1;

function updateHover() {
    targetHover = isHovered ? 1.0 : 0.0;
    currentHover += (targetHover - currentHover) * LERP_SPEED;
    gl.uniform1f(uHoverIntensityLocation, currentHover);
}
```

---

## Caveats

1. **WebGL1 Fallback**: The WebGL1 shaders use manually unrolled loops (3 iterations). Do not increase octaves without modifying the unroll.

2. **Mobile Performance**: On low-end mobile devices, consider:
   - Reducing canvas resolution (0.5x scale)
   - Disabling morph (`uMorphAmount = 0.0`)
   - Using CSS fallback for devices without WebGL2

3. **Time Overflow**: `uTime` should be reset or wrapped after ~24 hours to prevent floating-point precision issues:
   ```typescript
   uTime = uTime % 86400.0; // Wrap every 24 hours
   ```

4. **Texture Reads**: This shader is **pure procedural** (0 texture fetches), making it ideal for memory-constrained environments.

---

## Validation Checklist

- [ ] Shaders compile without errors on WebGL2
- [ ] Shaders compile without errors on WebGL1 (fallback)
- [ ] FAST variant runs at 30+ fps on iPhone 12
- [ ] HQ variant runs at 60 fps on desktop Chrome
- [ ] Colors match palette within ΔE < 5
- [ ] Morph animation responds to `uMorphAmount` changes
- [ ] Hover boost responds to `uHoverIntensity` changes
- [ ] Mouse tracking responds within 16ms (1 frame)
- [ ] Blob attraction visible near cursor
- [ ] Glow highlight appears near cursor on hover
- [ ] No visible banding in gradient (precision sufficient)
- [ ] Animation loops seamlessly (no visible jump)

---

## License

These shaders are provided under the same license as the parent project.
