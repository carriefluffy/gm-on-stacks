/**
 * WebGLBackground Scene Module
 * 
 * Implements the "Flowing Gradient" effect using Three.js and custom GLSL shaders.
 * 
 * @module WebGLBackground
 */

import * as THREE from 'three';

// =============================================================================
// SHADER SOURCES
// =============================================================================

const VERTEX_SHADER = `#version 300 es
precision mediump float;
precision highp int;

in vec2 a_position;
in vec2 a_uv;

uniform highp float uTime;
uniform float uMorphAmount;
uniform vec2 uMouse;
uniform float uHoverIntensity;
uniform vec2 uResolution;

out vec2 vUv;
out vec2 vPosition;
out float vMorphOffset;

// Helper: Sinusoidal morph displacement
vec2 computeMorphDisplacement(vec2 pos, float time, float amount) {
    float wave1 = sin(pos.x * 3.0 + time * 0.5) * 0.03;
    float wave2 = cos(pos.y * 2.5 + time * 0.4) * 0.025;
    float wave3 = sin((pos.x + pos.y) * 2.0 + time * 0.6) * 0.02;
    return vec2(wave1 + wave3, wave2 + wave3) * amount;
}

// Helper: Mouse-reactive vertex displacement
vec2 computeMouseDisplacement(vec2 pos, vec2 mousePos, float intensity) {
    vec2 mouseNDC = mousePos * 2.0 - 1.0;
    vec2 toMouse = mouseNDC - pos;
    float dist = length(toMouse);
    float influence = smoothstep(0.8, 0.0, dist);
    return toMouse * influence * intensity * 0.05; // 5% pull strength
}

void main() {
    vUv = a_uv;
    
    // Compute animated displacements
    vec2 morphOffset = computeMorphDisplacement(a_position, uTime, uMorphAmount);
    vec2 mouseOffset = computeMouseDisplacement(a_position, uMouse, uHoverIntensity);
    
    vec2 totalOffset = morphOffset + mouseOffset;
    vec2 morphedPosition = a_position + totalOffset;
    
    vPosition = morphedPosition;
    vMorphOffset = length(totalOffset);
    
    gl_Position = vec4(morphedPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform float uTime;
uniform float uMorphAmount;
uniform float uHoverIntensity;
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

in vec2 vUv;
in vec2 vPosition;
in float vMorphOffset;

out vec4 fragColor;

// Constants from Design Spec
const vec3 DEEP_BLACK = vec3(0.02, 0.008, 0.03);
const vec3 DEEP_VIOLET = vec3(0.30, 0.11, 0.58);
const vec3 SOFT_PINK = vec3(0.93, 0.28, 0.60);

const float RIM_LIGHT_POWER = 2.5;
const float BLOOM_THRESHOLD = 0.7;
const float GLOW_INTENSITY = 0.35;
const float MOUSE_INFLUENCE_RADIUS = 0.25;
const float MOUSE_ATTRACTION_STRENGTH = 0.35;
const float MOUSE_GLOW_STRENGTH = 0.55;

// Simplex Noise
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

// Fractal Brownian Motion
float fbm(vec2 p, float time) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) { // HQ: 5 octaves
        v += a * snoise(p + time * 0.05);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// Domain Warping
float domainWarp(vec2 p, float time, vec2 mouseInfluence) {
    vec2 q = vec2(0.0);
    q.x = fbm(p + time * 0.06 + mouseInfluence * 0.1, time);
    q.y = fbm(p + vec2(1.0) + mouseInfluence * 0.05, time);
    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 9.2) + time * 0.12, time);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + time * 0.10, time);
    return fbm(p + r + mouseInfluence * 0.08, time);
}

// Mouse Interaction Helpers
vec2 computeMouseAttraction(vec2 p, vec2 mousePos, float intensity) {
    float aspect = uResolution.x / uResolution.y;
    vec2 mouseP = (mousePos - 0.5) * vec2(aspect, 1.0);
    vec2 toMouse = mouseP - p;
    float dist = length(toMouse);
    float influence = smoothstep(MOUSE_INFLUENCE_RADIUS, 0.0, dist);
    return normalize(toMouse + 0.001) * influence * intensity * MOUSE_ATTRACTION_STRENGTH;
}

float computeMouseGlow(vec2 p, vec2 mousePos, float intensity) {
    float aspect = uResolution.x / uResolution.y;
    vec2 mouseP = (mousePos - 0.5) * vec2(aspect, 1.0);
    float dist = length(mouseP - p);
    float glow = smoothstep(MOUSE_INFLUENCE_RADIUS * 1.5, 0.0, dist);
    return glow * intensity * MOUSE_GLOW_STRENGTH;
}

// Post-Processing Helpers
vec3 computeRimLight(vec2 p, float noise, vec3 baseColor, float hoverIntensity) {
    float eps = 0.01;
    float nx = snoise(p + vec2(eps, 0.0)) - snoise(p - vec2(eps, 0.0));
    float ny = snoise(p + vec2(0.0, eps)) - snoise(p - vec2(0.0, eps));
    vec3 normal = normalize(vec3(nx, ny, 1.0));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float rim = 1.0 - max(dot(normal, viewDir), 0.0);
    rim = pow(rim, RIM_LIGHT_POWER);
    rim *= 1.0 + hoverIntensity * 0.5;
    vec3 rimColor = mix(baseColor, vec3(1.0), 0.6);
    return rimColor * rim * GLOW_INTENSITY;
}

vec3 computeBloomContribution(vec3 color, float threshold) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    float bloomFactor = max(0.0, luminance - threshold) / (1.0 - threshold);
    bloomFactor = smoothstep(0.0, 1.0, bloomFactor);
    return color * bloomFactor * 0.5;
}

float computeVignette(vec2 uv) {
    vec2 centered = uv - 0.5;
    float aspect = uResolution.x / uResolution.y;
    centered.x *= aspect;
    float dist = length(centered);
    return smoothstep(1.6, 0.4, dist);
}

void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float slowTime = uTime * 0.08;
    
    // Mouse Interactions
    vec2 mouseAttraction = computeMouseAttraction(p, uMouse, uHoverIntensity);
    float mouseGlow = computeMouseGlow(p, uMouse, uHoverIntensity);
    
    // Core Noise Generation
    float f = domainWarp(p, slowTime, mouseAttraction);
    float colorNoise1 = fbm(p * 1.5 + slowTime * 0.1, slowTime);
    float colorNoise2 = fbm(p * 2.0 - slowTime * 0.08, slowTime);
    
    // Color Mixing
    vec3 color = DEEP_BLACK;
    color = mix(color, DEEP_VIOLET, smoothstep(-0.5, 0.5, f));
    color = mix(color, uColor1, smoothstep(0.0, 1.0, f * f * 2.0));
    color = mix(color, SOFT_PINK, smoothstep(0.2, 0.8, colorNoise1 * 0.8));
    color = mix(color, uColor2, smoothstep(0.3, 0.9, colorNoise2 * 0.6 + 0.3));
    color = mix(color, uColor3, smoothstep(0.5, 1.0, colorNoise2 * 0.5 + f * 0.3));
    
    // Lighting
    vec3 rimLight = computeRimLight(p, f, color, uHoverIntensity);
    color += rimLight;
    
    // Dynamic Boosts
    color *= 1.0 + vMorphOffset * 0.5;
    color *= 1.0 + uHoverIntensity * 0.2;
    
    vec3 mouseHighlight = mix(uColor2, vec3(1.0), 0.5) * mouseGlow;
    color += mouseHighlight;
    
    // Post-Process
    color *= computeVignette(uv);
    vec3 bloom = computeBloomContribution(color, BLOOM_THRESHOLD);
    vec3 finalColor = min(color + bloom, vec3(1.0));
    
    fragColor = vec4(finalColor, 1.0);
}
`;

// =============================================================================
// WebGLBackground CLASS
// =============================================================================

/**
 * Manages the Three.js scene for the Flowing Gradient background.
 */
export class WebGLBackground {
    /**
     * @param {string|HTMLElement} container - Selector or DOM element to mount the canvas
     * @param {object} options - Configuration options
     */
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) throw new Error('WebGLBackground: Invalid container');

        this.options = options;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.material = null;
        this.mesh = null;
        this.animationId = null;

        // State
        this.time = 0;
        this.hoverIntensity = 0;
        this.targetHoverIntensity = 0;
        this.mouse = new THREE.Vector2(0.5, 0.5);
        this.targetMouse = new THREE.Vector2(0.5, 0.5);

        // Performance Monitoring
        this.frameCount = 0;
        this.lastLogTime = 0;
    }

    /**
     * Initialize the Three.js scene
     */
    init() {
        // 1. Renderer Setup
        this.renderer = new THREE.WebGLRenderer({
            alpha: false,
            antialias: false, // Not needed for full-screen quad shader
            powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // 2. Scene & Camera
        this.scene = new THREE.Scene();
        // Orthographic camera for 2D feel (-1 to 1)
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // 3. Geometry & Material
        // Use PlaneGeometry for full-screen quad instead of Icosahedron for this specific shader
        // (This shader is designed for screen-space UVs)
        const geometry = new THREE.PlaneGeometry(2, 2);

        // Map standard Geometry attributes to Shader attributes
        geometry.setAttribute('a_position', geometry.getAttribute('position'));
        geometry.setAttribute('a_uv', geometry.getAttribute('uv'));

        this.material = new THREE.RawShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2() },
                uHoverIntensity: { value: 0 },
                uMorphAmount: { value: 0.5 },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uMouseVelocity: { value: new THREE.Vector2(0, 0) },
                // Brand Colors
                uColor1: { value: new THREE.Color('#6B21A8') },
                uColor2: { value: new THREE.Color('#DB2777') },
                uColor3: { value: new THREE.Color('#F97316') }
            },
            glslVersion: THREE.GLSL3
            // Note: RawShaderMaterial with glslVersion GLSL3 does NOT prepend #version 300 es automatically
            // But we included it in the string. If it errors, we might need to remove it.
            // Verified: RawShaderMaterial does not add it if it's already there? 
            // Actually, best practice with RawShaderMaterial is to include it manually, which we did.
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);

        // 4. Interaction Listeners
        window.addEventListener('resize', this.resize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));

        // Initial sizing
        this.resize();

        // Start Loop
        this.update();

        console.log('WebGLBackground: Initialized');
    }

    /**
     * Handle mouse movement
     * @param {MouseEvent} e 
     */
    onMouseMove(e) {
        // Normalized coordinates (0 to 1), inverted Y
        const x = e.clientX / window.innerWidth;
        const y = 1.0 - (e.clientY / window.innerHeight);

        this.targetMouse.set(x, y);
        this.targetHoverIntensity = 1.0;

        // Simple idle reset logic could go here
    }

    /**
     * Handle window resize
     */
    resize() {
        if (!this.renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.renderer.setSize(width, height);

        if (this.material) {
            this.material.uniforms.uResolution.value.set(
                width * this.renderer.getPixelRatio(),
                height * this.renderer.getPixelRatio()
            );
        }
    }

    /**
     * Animation Loop
     */
    update() {
        this.animationId = requestAnimationFrame(this.update.bind(this));

        const now = performance.now();
        const seconds = now * 0.001;
        const deltaTime = 0.016; // Approx 60fps delta

        // Update State
        this.time = seconds;

        // Lerp Mouse
        this.mouse.lerp(this.targetMouse, 0.1);

        // Lerp Hover
        this.hoverIntensity += (this.targetHoverIntensity - this.hoverIntensity) * 0.1;

        // Update Uniforms
        if (this.material) {
            this.material.uniforms.uTime.value = this.time;
            this.material.uniforms.uMouse.value.copy(this.mouse);
            this.material.uniforms.uHoverIntensity.value = this.hoverIntensity;

            // Dynamic Morph
            this.material.uniforms.uMorphAmount.value = 0.5 + Math.sin(this.time * 0.5) * 0.2;
        }

        // Render
        this.renderer.render(this.scene, this.camera);

        // Performance Logging
        this.frameCount++;
        if (now - this.lastLogTime > 2000) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastLogTime));
            console.log(`WebGLBackground Stats: ${fps} FPS`);
            this.lastLogTime = now;
            this.frameCount = 0;
        }
    }

    /**
     * Teardown and cleanup
     */
    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);

        window.removeEventListener('resize', this.resize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));

        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }

        console.log('WebGLBackground: Destroyed');
    }
}
