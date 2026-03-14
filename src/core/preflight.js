/**
 * Preflight Check for Device Capabilities
 * Detects WebGPU, WASM SIMD, and Memory/CPU constraints to determine the optimal ML profile.
 */

export const getCapabilities = async () => {
    const caps = {
        webgpu: false,
        wasmSimd: false,
        memory: navigator.deviceMemory || 4,
        threads: navigator.hardwareConcurrency || 2,
        isLowPower: false
    };

    // Check WebGPU
    if (navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                caps.webgpu = true;
            }
        } catch (e) {
            console.warn('WebGPU check failed:', e);
        }
    }

    // Check WASM SIMD
    // Based on https://github.com/GoogleChromeLabs/wasm-feature-detect
    const simdBits = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 15, 11]);
    try {
        if (typeof WebAssembly === "object" && typeof WebAssembly.validate === "function") {
            caps.wasmSimd = WebAssembly.validate(simdBits);
        }
    } catch (e) {
        console.warn('WASM SIMD check failed:', e);
    }

    // Determine if device is low power/resource
    // Mobile or low memory/CPU
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    caps.isLowPower = isMobile || caps.memory <= 4 || caps.threads <= 4;

    return caps;
};

export const getRecommendedProfile = (caps) => {
    if (caps.webgpu && !caps.isLowPower) {
        return 'ULTRA'; // WebGPU + High specs
    }
    
    if (caps.webgpu || (caps.wasmSimd && caps.threads > 4)) {
        return 'FULL'; // Standard Desktop/High-end Mobile
    }

    if (caps.wasmSimd || caps.memory > 2) {
        return 'BALANCED'; // Mid-range
    }

    return 'LITE'; // Low-end, STT only + Social Battery
};
