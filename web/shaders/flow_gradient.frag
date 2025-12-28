#version 300 es
// ============================================================================
// flow_gradient.frag - Fragment Shader for Flowing Gradient Background
// Target: WebGL2 (GLSL ES 3.00)
// Author: GPU Graphics Engineer (Shader Architect Role)
// ============================================================================

// -----------------------------------------------------------------------------
// PRECISION DECLARATIONS
// Fragment shader: mediump default for color calculations
// highp for UV/position math and noise calculations to avoid banding
// Justification: Noise functions are sensitive to precision; colors are not.
// -----------------------------------------------------------------------------
#if QUALITY == 1
    precision highp float;      // HQ: Full precision for complex lighting
#else
    precision mediump float;    // FAST: Mediump throughout for mobile
#endif
precision highp int;

// -----------------------------------------------------------------------------
// QUALITY VARIANTS
// Define QUALITY before including this shader:
//   #define QUALITY 0  // FAST (mobile) - 3 FBM octaves, simplified lighting
//   #define QUALITY 1  // HQ (desktop) - 5 FBM octaves, full rim light + bloom
// Default to FAST if not defined
// -----------------------------------------------------------------------------
#ifndef QUALITY
    #define QUALITY 0
#endif

// -----------------------------------------------------------------------------
// UNIFORMS
// All values exposed for animation/configuration; nothing hard-coded.
// -----------------------------------------------------------------------------

// Per-frame uniforms (update every frame)
uniform float uTime;               // Animation timer (seconds)
uniform float uMorphAmount;        // Morph intensity 0-1 (animation driven)
uniform float uHoverIntensity;     // Hover effect 0-1 (interaction driven)
uniform vec2 uMouse;               // Normalized mouse position (0-1, origin top-left)
uniform vec2 uMouseVelocity;       // Mouse velocity for trail effects

// Per-resize uniforms (update on viewport change)
uniform vec2 uResolution;          // Viewport dimensions (pixels)

// Per-material uniforms (set once or on palette change)
uniform vec3 uColor1;              // Primary color: Royal Purple (#6B21A8)
uniform vec3 uColor2;              // Secondary color: Hot Magenta (#DB2777)
uniform vec3 uColor3;              // Tertiary color: Peach Orange (#F97316)

// -----------------------------------------------------------------------------
// VARYINGS (inputs from vertex shader)
// -----------------------------------------------------------------------------
in vec2 vUv;
in vec2 vPosition;
in float vMorphOffset;

// -----------------------------------------------------------------------------
// OUTPUT
// -----------------------------------------------------------------------------
out vec4 fragColor;

// -----------------------------------------------------------------------------
// CONSTANTS (derived from Design Spec)
// -----------------------------------------------------------------------------
const vec3 DEEP_BLACK = vec3(0.02, 0.008, 0.03);    // #050208
const vec3 DEEP_VIOLET = vec3(0.30, 0.11, 0.58);     // #4C1D95
const vec3 SOFT_PINK = vec3(0.93, 0.28, 0.60);       // #EC4899

const float VIGNETTE_STRENGTH = 0.4;
const float GLOW_INTENSITY = 0.35;
const float RIM_LIGHT_POWER = 2.5;
const float BLOOM_THRESHOLD = 0.7;
const float MOUSE_INFLUENCE_RADIUS = 0.4;  // How far mouse affects the scene
const float MOUSE_ATTRACTION_STRENGTH = 0.15; // How much blobs move toward mouse
const float MOUSE_GLOW_STRENGTH = 0.3;     // Glow boost near cursor

// -----------------------------------------------------------------------------
// NOISE FUNCTIONS
// Simplex 2D noise for organic blob shapes
// -----------------------------------------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    vec3 g = a0.xzx * vec3(x0.x, x12.x, x12.z) + h.xzy * vec3(x0.y, x12.y, x12.w);
    vec3 t = 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    return 130.0 * dot(m, g / sqrt(t));
}

// -----------------------------------------------------------------------------
// FRACTAL BROWNIAN MOTION (FBM)
// Layered noise for organic variation
// FAST: 3 octaves | HQ: 5 octaves
// -----------------------------------------------------------------------------
float fbm(vec2 p, float time) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    
    #if QUALITY == 1
        // HQ: 5 octaves for maximum detail
        const int OCTAVES = 5;
    #else
        // FAST: 3 octaves for mobile performance
        const int OCTAVES = 3;
    #endif
    
    for (int i = 0; i < OCTAVES; ++i) {
        v += a * snoise(p + time * 0.05);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// -----------------------------------------------------------------------------
// DOMAIN WARPING
// Creates organic, liquid-like distortion
// -----------------------------------------------------------------------------
float domainWarp(vec2 p, float time, vec2 mouseInfluence) {
    vec2 q = vec2(0.0);
    q.x = fbm(p + time * 0.06 + mouseInfluence * 0.1, time);
    q.y = fbm(p + vec2(1.0) + mouseInfluence * 0.05, time);
    
    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 9.2) + time * 0.12, time);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + time * 0.10, time);
    
    return fbm(p + r + mouseInfluence * 0.08, time);
}

// -----------------------------------------------------------------------------
// MOUSE INTERACTION
// Computes attraction and glow based on cursor position
// -----------------------------------------------------------------------------
vec2 computeMouseAttraction(vec2 p, vec2 mousePos, float intensity) {
    // Convert mouse from UV space to aspect-corrected space
    float aspect = uResolution.x / uResolution.y;
    vec2 mouseP = (mousePos - 0.5) * vec2(aspect, 1.0);
    
    // Distance from current fragment to mouse
    vec2 toMouse = mouseP - p;
    float dist = length(toMouse);
    
    // Smooth falloff based on radius
    float influence = smoothstep(MOUSE_INFLUENCE_RADIUS, 0.0, dist);
    
    // Return attraction vector (pulls noise toward mouse)
    return normalize(toMouse + 0.001) * influence * intensity * MOUSE_ATTRACTION_STRENGTH;
}

float computeMouseGlow(vec2 p, vec2 mousePos, float intensity) {
    float aspect = uResolution.x / uResolution.y;
    vec2 mouseP = (mousePos - 0.5) * vec2(aspect, 1.0);
    
    float dist = length(mouseP - p);
    float glow = smoothstep(MOUSE_INFLUENCE_RADIUS * 1.5, 0.0, dist);
    
    return glow * intensity * MOUSE_GLOW_STRENGTH;
}

// -----------------------------------------------------------------------------
// LIGHTING MODEL
// Custom rim light + ambient glow
// -----------------------------------------------------------------------------
vec3 computeRimLight(vec2 p, float noise, vec3 baseColor, float hoverIntensity) {
    // Pseudo-normal from noise gradient (cheap approximation)
    float eps = 0.01;
    float nx = snoise(p + vec2(eps, 0.0)) - snoise(p - vec2(eps, 0.0));
    float ny = snoise(p + vec2(0.0, eps)) - snoise(p - vec2(0.0, eps));
    vec3 normal = normalize(vec3(nx, ny, 1.0));
    
    // View direction (facing camera)
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Rim light calculation (Fresnel-like)
    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, RIM_LIGHT_POWER);
    
    // Boost rim on hover
    rim *= 1.0 + hoverIntensity * 0.5;
    
    // Rim color: blend toward white for glow
    vec3 rimColor = mix(baseColor, vec3(1.0), 0.6);
    
    return rimColor * rim * GLOW_INTENSITY;
}

// -----------------------------------------------------------------------------
// BLOOM PREPARATION
// Outputs additive highlights for post-process bloom
// -----------------------------------------------------------------------------
vec3 computeBloomContribution(vec3 color, float threshold) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    float bloomFactor = max(0.0, luminance - threshold) / (1.0 - threshold);
    
    #if QUALITY == 1
        // HQ: Soft bloom falloff
        bloomFactor = smoothstep(0.0, 1.0, bloomFactor);
        return color * bloomFactor * 0.5;
    #else
        // FAST: Hard threshold, no smoothstep
        return color * step(threshold, luminance) * 0.3;
    #endif
}

// -----------------------------------------------------------------------------
// VIGNETTE
// Radial darkening toward edges (spec: 0.4 opacity at corners)
// -----------------------------------------------------------------------------
float computeVignette(vec2 uv) {
    vec2 centered = uv - 0.5;
    float aspect = uResolution.x / uResolution.y;
    centered.x *= aspect;
    float dist = length(centered);
    return smoothstep(1.6, 0.4, dist);
}

// -----------------------------------------------------------------------------
// MAIN FRAGMENT SHADER
// -----------------------------------------------------------------------------
void main() {
    // Aspect-corrected UV coordinates
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    
    // Slow time factor (8-12s cycles per spec)
    float slowTime = uTime * 0.08;
    
    // ---------------------------------------------------------------------
    // MOUSE INTERACTION
    // Compute attraction and local effects
    // ---------------------------------------------------------------------
    vec2 mouseAttraction = computeMouseAttraction(p, uMouse, uHoverIntensity);
    float mouseGlow = computeMouseGlow(p, uMouse, uHoverIntensity);
    
    // Domain-warped noise for organic flow (with mouse influence)
    float f = domainWarp(p, slowTime, mouseAttraction);
    
    // Secondary noise layers for color variation
    float colorNoise1 = fbm(p * 1.5 + slowTime * 0.1, slowTime);
    float colorNoise2 = fbm(p * 2.0 - slowTime * 0.08, slowTime);
    
    // ---------------------------------------------------------------------
    // COLOR MIXING (per spec palette)
    // Layer colors from dark to bright
    // ---------------------------------------------------------------------
    vec3 color = DEEP_BLACK;
    
    // Base purple layer
    color = mix(color, DEEP_VIOLET, smoothstep(-0.5, 0.5, f));
    color = mix(color, uColor1, smoothstep(0.0, 1.0, f * f * 2.0));
    
    // Magenta/Pink mid-tones
    color = mix(color, SOFT_PINK, smoothstep(0.2, 0.8, colorNoise1 * 0.8));
    color = mix(color, uColor2, smoothstep(0.3, 0.9, colorNoise2 * 0.6 + 0.3));
    
    // Orange accent highlights
    color = mix(color, uColor3, smoothstep(0.5, 1.0, colorNoise2 * 0.5 + f * 0.3));
    
    // ---------------------------------------------------------------------
    // LIGHTING
    // Add rim light and glow
    // ---------------------------------------------------------------------
    #if QUALITY == 1
        // HQ: Full rim lighting
        vec3 rimLight = computeRimLight(p, f, color, uHoverIntensity);
        color += rimLight;
    #else
        // FAST: Simplified glow (just brightness boost)
        float glow = f * f * f + 0.5 * f * f;
        color += vec3(0.05, 0.02, 0.08) * glow * (1.0 + uHoverIntensity * 0.3);
    #endif
    
    // Morph-reactive brightness boost
    color *= 1.0 + vMorphOffset * 0.5;
    
    // Hover intensity boost
    color *= 1.0 + uHoverIntensity * 0.2;
    
    // Mouse proximity glow (additive highlight near cursor)
    vec3 mouseHighlight = mix(uColor2, vec3(1.0), 0.5) * mouseGlow;
    color += mouseHighlight;
    
    // ---------------------------------------------------------------------
    // POST-PROCESSING
    // Vignette and bloom preparation
    // ---------------------------------------------------------------------
    
    // Apply vignette
    float vignette = computeVignette(uv);
    color *= vignette;
    
    // Compute bloom contribution (additive)
    vec3 bloom = computeBloomContribution(color, BLOOM_THRESHOLD);
    
    // Final color: base + bloom highlight
    vec3 finalColor = color + bloom;
    
    // Clamp to prevent oversaturation
    finalColor = min(finalColor, vec3(1.0));
    
    // Output with full opacity
    fragColor = vec4(finalColor, 1.0);
}
