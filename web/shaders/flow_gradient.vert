#version 300 es
// ============================================================================
// flow_gradient.vert - Vertex Shader for Flowing Gradient Background
// Target: WebGL2 (GLSL ES 3.00)
// Author: GPU Graphics Engineer (Shader Architect Role)
// ============================================================================

// -----------------------------------------------------------------------------
// PRECISION DECLARATIONS
// Vertex shader: mediump for positions (sufficient for NDC quad)
// highp for time to avoid precision loss in animation calculations
// -----------------------------------------------------------------------------
precision mediump float;
precision highp int;

// -----------------------------------------------------------------------------
// ATTRIBUTES (per-vertex inputs)
// -----------------------------------------------------------------------------
in vec2 a_position;     // NDC quad positions: (-1,-1) to (1,1)
in vec2 a_uv;           // UV coordinates: (0,0) to (1,1)

// -----------------------------------------------------------------------------
// UNIFORMS
// -----------------------------------------------------------------------------
// Per-frame uniforms
uniform highp float uTime;         // Animation timer (seconds), per-frame update
uniform float uMorphAmount;        // Morph intensity 0-1, animation driven
uniform vec2 uMouse;               // Normalized mouse position (0-1)
uniform float uHoverIntensity;     // Hover effect 0-1 (interaction driven)

// Per-resize uniforms
uniform vec2 uResolution;          // Viewport dimensions (pixels)

// -----------------------------------------------------------------------------
// VARYINGS (outputs to fragment shader)
// -----------------------------------------------------------------------------
out vec2 vUv;                      // Interpolated UV coordinates
out vec2 vPosition;                // NDC position for fragment calculations
out float vMorphOffset;            // Computed morph displacement for fragment

// -----------------------------------------------------------------------------
// QUALITY VARIANTS
// Define QUALITY before including this shader:
//   #define QUALITY 0  // FAST (mobile)
//   #define QUALITY 1  // HQ (desktop)
// Default to FAST if not defined
// -----------------------------------------------------------------------------
#ifndef QUALITY
    #define QUALITY 0
#endif

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

// Simple 2D hash for pseudo-random values
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Sinusoidal morph displacement
// Moves vertices in a wave pattern for organic blob deformation
vec2 computeMorphDisplacement(vec2 pos, float time, float amount) {
    #if QUALITY == 1
        // HQ: Full sinusoidal morph with multiple frequencies
        float wave1 = sin(pos.x * 3.0 + time * 0.5) * 0.03;
        float wave2 = cos(pos.y * 2.5 + time * 0.4) * 0.025;
        float wave3 = sin((pos.x + pos.y) * 2.0 + time * 0.6) * 0.02;
        return vec2(wave1 + wave3, wave2 + wave3) * amount;
    #else
        // FAST: Single sinusoidal wave (cheaper)
        float wave = sin(pos.x * 3.0 + pos.y * 2.5 + time * 0.5) * 0.03;
        return vec2(wave) * amount;
    #endif
}

// Mouse-reactive vertex displacement
// Pulls vertices slightly toward cursor position
vec2 computeMouseDisplacement(vec2 pos, vec2 mousePos, float intensity) {
    // Convert mouse from UV (0-1) to NDC (-1 to 1)
    vec2 mouseNDC = mousePos * 2.0 - 1.0;
    
    // Distance from vertex to mouse
    vec2 toMouse = mouseNDC - pos;
    float dist = length(toMouse);
    
    // Smooth falloff (affects vertices within radius 0.8)
    float influence = smoothstep(0.8, 0.0, dist);
    
    // Small displacement toward mouse
    return toMouse * influence * intensity * 0.05;
}

// -----------------------------------------------------------------------------
// MAIN VERTEX SHADER
// -----------------------------------------------------------------------------
void main() {
    // Pass UV coordinates to fragment shader
    vUv = a_uv;
    
    // Compute morph displacement (time-based waves)
    vec2 morphOffset = computeMorphDisplacement(a_position, uTime, uMorphAmount);
    
    // Compute mouse-reactive displacement
    vec2 mouseOffset = computeMouseDisplacement(a_position, uMouse, uHoverIntensity);
    
    // Combine displacements
    vec2 totalOffset = morphOffset + mouseOffset;
    
    // Apply morph to position
    vec2 morphedPosition = a_position + totalOffset;
    
    // Pass data to fragment shader
    vPosition = morphedPosition;
    vMorphOffset = length(totalOffset);
    
    // Final clip-space position (full-screen quad, no projection needed)
    gl_Position = vec4(morphedPosition, 0.0, 1.0);
}
