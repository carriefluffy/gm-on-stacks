// ============================================================================
// flow_gradient_webgl1.vert - WebGL1 Fallback Vertex Shader
// Target: WebGL1 (GLSL ES 1.00)
// ============================================================================

precision mediump float;

// -----------------------------------------------------------------------------
// ATTRIBUTES
// -----------------------------------------------------------------------------
attribute vec2 a_position;
attribute vec2 a_uv;

// -----------------------------------------------------------------------------
// UNIFORMS
// -----------------------------------------------------------------------------
uniform float uTime;
uniform float uMorphAmount;
uniform vec2 uResolution;

// -----------------------------------------------------------------------------
// VARYINGS
// -----------------------------------------------------------------------------
varying vec2 vUv;
varying vec2 vPosition;
varying float vMorphOffset;

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
void main() {
    vUv = a_uv;
    
    // Simplified morph for WebGL1
    float wave = sin(a_position.x * 3.0 + a_position.y * 2.5 + uTime * 0.5) * 0.03;
    vec2 morphOffset = vec2(wave) * uMorphAmount;
    
    vec2 morphedPosition = a_position + morphOffset;
    
    vPosition = morphedPosition;
    vMorphOffset = length(morphOffset);
    
    gl_Position = vec4(morphedPosition, 0.0, 1.0);
}
