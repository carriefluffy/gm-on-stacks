import { useEffect, useRef } from 'react';
import { WebGLBackground } from './scene.js';

export default function WebGLBackgroundEmbed() {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize
        const bg = new WebGLBackground(containerRef.current);
        bg.init();

        // Cleanup on unmount
        return () => {
            bg.destroy();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ position: 'fixed', inset: 0, zIndex: -1 }}
            aria-hidden="true"
        />
    );
}
