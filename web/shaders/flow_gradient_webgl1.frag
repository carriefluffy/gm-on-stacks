// ============================================================================
// flow_gradient_webgl1.frag - WebGL1 Fallback Fragment Shader
// Target: WebGL1 (GLSL ES 1.00)
// Note: Simplified version for older browsers; no quality variants.
// ============================================================================

precision mediump float;

// -----------------------------------------------------------------------------
// UNIFORMS
// -----------------------------------------------------------------------------
uniform float uTime;
uniform float uMorphAmount;
uniform float uHoverIntensity;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

// -----------------------------------------------------------------------------
// VARYINGS
// -----------------------------------------------------------------------------
varying vec2 vUv;
varying vec2 vPosition;
varying float vMorphOffset;

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------
const vec3 DEEP_BLACK = vec3(0.02, 0.008, 0.03);
const vec3 DEEP_VIOLET = vec3(0.30, 0.11, 0.58);

// -----------------------------------------------------------------------------
// NOISE (Simplified for WebGL1)
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

// FBM - 3 octaves only for WebGL1
float fbm(vec2 p, float time) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    
    // Manual unroll for WebGL1 (no guaranteed for-loop support)
    v += a * snoise(p + time * 0.05); p = p * 2.0 + shift; a *= 0.5;
    v += a * snoise(p + time * 0.05); p = p * 2.0 + shift; a *= 0.5;
    v += a * snoise(p + time * 0.05);
    
    return v;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    
    float slowTime = uTime * 0.08;
    
    // Simplified domain warping
    vec2 q = vec2(fbm(p + slowTime * 0.06, slowTime), fbm(p + vec2(1.0), slowTime));
    float f = fbm(p + q, slowTime);
    
    // Color mixing
    vec3 color = DEEP_BLACK;
    color = mix(color, DEEP_VIOLET, smoothstep(-0.5, 0.5, f));
    color = mix(color, uColor1, smoothstep(0.0, 1.0, f * f * 2.0));
    color = mix(color, uColor2, smoothstep(0.3, 0.9, f * 0.6 + 0.3));
    color = mix(color, uColor3, smoothstep(0.5, 1.0, f * 0.5));
    
    // Simple glow
    float glow = f * f * f + 0.5 * f * f;
    color += vec3(0.05, 0.02, 0.08) * glow * (1.0 + uHoverIntensity * 0.3);
    
    // Hover boost
    color *= 1.0 + uHoverIntensity * 0.2;
    
    // Vignette
    float dist = length(p);
    float vignette = smoothstep(1.6, 0.4, dist);
    color *= vignette;
    
    gl_FragColor = vec4(color, 1.0);
}
