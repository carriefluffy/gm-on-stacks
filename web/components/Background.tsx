"use client";

import { useEffect, useRef, useCallback } from "react";

// =============================================================================
// Shader Sources (Inlined from flow_gradient.vert and flow_gradient.frag)
// Using HQ quality variant for desktop
// =============================================================================

const VERTEX_SHADER = `#version 300 es
precision highp float;
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

vec2 computeMorphDisplacement(vec2 pos, float time, float amount) {
    float wave1 = sin(pos.x * 3.0 + time * 0.5) * 0.03;
    float wave2 = cos(pos.y * 2.5 + time * 0.4) * 0.025;
    float wave3 = sin((pos.x + pos.y) * 2.0 + time * 0.6) * 0.02;
    return vec2(wave1 + wave3, wave2 + wave3) * amount;
}

vec2 computeMouseDisplacement(vec2 pos, vec2 mousePos, float intensity) {
    vec2 mouseNDC = mousePos * 2.0 - 1.0;
    vec2 toMouse = mouseNDC - pos;
    float dist = length(toMouse);
    float influence = smoothstep(0.8, 0.0, dist);
    return toMouse * influence * intensity * 0.05;
}

void main() {
    vUv = a_uv;
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

const vec3 DEEP_BLACK = vec3(0.02, 0.008, 0.03);
const vec3 DEEP_VIOLET = vec3(0.30, 0.11, 0.58);
const vec3 SOFT_PINK = vec3(0.93, 0.28, 0.60);
const float GLOW_INTENSITY = 0.35;
const float RIM_LIGHT_POWER = 2.5;
const float BLOOM_THRESHOLD = 0.7;
const float MOUSE_INFLUENCE_RADIUS = 0.25;  // Reduced radius
const float MOUSE_ATTRACTION_STRENGTH = 0.35;
const float MOUSE_GLOW_STRENGTH = 0.55;

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

float fbm(vec2 p, float time) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) {
        v += a * snoise(p + time * 0.05);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

float domainWarp(vec2 p, float time, vec2 mouseInfluence) {
    vec2 q = vec2(0.0);
    q.x = fbm(p + time * 0.06 + mouseInfluence * 0.1, time);
    q.y = fbm(p + vec2(1.0) + mouseInfluence * 0.05, time);
    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 9.2) + time * 0.12, time);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + time * 0.10, time);
    return fbm(p + r + mouseInfluence * 0.08, time);
}

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
    
    vec2 mouseAttraction = computeMouseAttraction(p, uMouse, uHoverIntensity);
    float mouseGlow = computeMouseGlow(p, uMouse, uHoverIntensity);
    
    float f = domainWarp(p, slowTime, mouseAttraction);
    float colorNoise1 = fbm(p * 1.5 + slowTime * 0.1, slowTime);
    float colorNoise2 = fbm(p * 2.0 - slowTime * 0.08, slowTime);
    
    vec3 color = DEEP_BLACK;
    color = mix(color, DEEP_VIOLET, smoothstep(-0.5, 0.5, f));
    color = mix(color, uColor1, smoothstep(0.0, 1.0, f * f * 2.0));
    color = mix(color, SOFT_PINK, smoothstep(0.2, 0.8, colorNoise1 * 0.8));
    color = mix(color, uColor2, smoothstep(0.3, 0.9, colorNoise2 * 0.6 + 0.3));
    color = mix(color, uColor3, smoothstep(0.5, 1.0, colorNoise2 * 0.5 + f * 0.3));
    
    vec3 rimLight = computeRimLight(p, f, color, uHoverIntensity);
    color += rimLight;
    
    color *= 1.0 + vMorphOffset * 0.5;
    color *= 1.0 + uHoverIntensity * 0.2;
    
    vec3 mouseHighlight = mix(uColor2, vec3(1.0), 0.5) * mouseGlow;
    color += mouseHighlight;
    
    float vignette = computeVignette(uv);
    color *= vignette;
    
    vec3 bloom = computeBloomContribution(color, BLOOM_THRESHOLD);
    vec3 finalColor = color + bloom;
    finalColor = min(finalColor, vec3(1.0));
    
    fragColor = vec4(finalColor, 1.0);
}
`;

// =============================================================================
// Background Component
// =============================================================================

export default function Background() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
    const hoverRef = useRef({ current: 0, target: 0 });

    const handleMouseMove = useCallback((e: MouseEvent) => {
        // Use window dimensions for normalized coordinates
        // Flip Y axis to match WebGL UVs (0 at bottom)
        mouseRef.current.targetX = e.clientX / window.innerWidth;
        mouseRef.current.targetY = 1.0 - (e.clientY / window.innerHeight);

        // Auto-activate hover effect on movement
        hoverRef.current.target = 1.0;

        // Reset to 0 after delay (basic idle check handled by React loop if needed, 
        // but for now keeping it simple: move = active)
    }, []);

    const handleMouseEnter = useCallback(() => {
        hoverRef.current.target = 1;
    }, []);

    const handleMouseLeave = useCallback(() => {
        hoverRef.current.target = 0;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const gl = canvas.getContext("webgl2");
        if (!gl) return;

        // Compile shaders
        function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error("Shader compile error:", gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return;
        }

        // Get uniform locations
        const uTime = gl.getUniformLocation(program, "uTime");
        const uMorphAmount = gl.getUniformLocation(program, "uMorphAmount");
        const uMouse = gl.getUniformLocation(program, "uMouse");
        const uMouseVelocity = gl.getUniformLocation(program, "uMouseVelocity");
        const uHoverIntensity = gl.getUniformLocation(program, "uHoverIntensity");
        const uResolution = gl.getUniformLocation(program, "uResolution");
        const uColor1 = gl.getUniformLocation(program, "uColor1");
        const uColor2 = gl.getUniformLocation(program, "uColor2");
        const uColor3 = gl.getUniformLocation(program, "uColor3");

        // Get attribute locations
        const aPosition = gl.getAttribLocation(program, "a_position");
        const aUv = gl.getAttribLocation(program, "a_uv");

        // Create buffers with position and UV data
        const vertices = new Float32Array([
            // Position (x, y), UV (u, v)
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1,
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Position attribute
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

        // UV attribute
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

        // Resize handler
        function resize() {
            if (!canvas || !gl) return;
            const dpr = Math.min(window.devicePixelRatio, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseenter", handleMouseEnter);
        window.addEventListener("mouseleave", handleMouseLeave);
        resize();

        // Set static uniforms (colors)
        gl.useProgram(program);
        gl.uniform3f(uColor1, 0.42, 0.13, 0.66); // Royal Purple
        gl.uniform3f(uColor2, 0.86, 0.15, 0.47); // Hot Magenta
        gl.uniform3f(uColor3, 0.98, 0.45, 0.09); // Peach Orange

        let animationId: number;
        let isVisible = true;

        const handleVisibilityChange = () => {
            isVisible = !document.hidden;
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        const LERP_SPEED = 0.08;

        const render = (time: number) => {
            if (!isVisible) {
                animationId = requestAnimationFrame(render);
                return;
            }

            time *= 0.001; // Convert to seconds

            // Lerp mouse position for smooth tracking
            mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * LERP_SPEED;
            mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * LERP_SPEED;

            // Lerp hover intensity
            hoverRef.current.current += (hoverRef.current.target - hoverRef.current.current) * LERP_SPEED;

            // Calculate morph amount (subtle pulse)
            const morphAmount = prefersReducedMotion ? 0 : 0.5 + Math.sin(time * 0.5) * 0.2;

            gl.useProgram(program);
            gl.bindVertexArray(vao);

            // Set per-frame uniforms
            gl.uniform1f(uTime, prefersReducedMotion ? 0 : time);
            gl.uniform1f(uMorphAmount, morphAmount);
            gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
            gl.uniform2f(uMouseVelocity, 0, 0);
            gl.uniform1f(uHoverIntensity, hoverRef.current.current);
            gl.uniform2f(uResolution, canvas.width, canvas.height);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            if (!prefersReducedMotion) {
                animationId = requestAnimationFrame(render);
            }
        };

        animationId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseenter", handleMouseEnter);
            window.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            cancelAnimationFrame(animationId);
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
        };
    }, [handleMouseMove, handleMouseEnter, handleMouseLeave]);

    return (
        <div
            className="fixed inset-0 -z-30 pointer-events-none overflow-hidden"
            role="img"
            aria-label="Animated gradient background"
        >
            {/* WebGL Canvas - pointer-events enabled for mouse tracking */}
            <canvas
                ref={canvasRef}
                className="w-full h-full pointer-events-auto"
                style={{ background: "#050208" }}
            />

            {/* Noise Overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.10]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    mixBlendMode: "overlay",
                }}
            />

            {/* CSS Fallback */}
            <noscript>
                <div
                    className="absolute inset-0"
                    style={{
                        background: "radial-gradient(ellipse at 30% 50%, #6B21A8 0%, #4C1D95 30%, #050208 70%)",
                    }}
                />
            </noscript>
        </div>
    );
}
