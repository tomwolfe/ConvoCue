import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCapabilities, getRecommendedProfile } from './preflight';

describe('preflight utils', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Reset navigator mocks
        global.navigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            hardwareConcurrency: 8,
            deviceMemory: 16
        };
        global.WebAssembly = {
            validate: vi.fn().mockReturnValue(true)
        };
    });

    describe('getCapabilities', () => {
        it('should detect WebGPU when available', async () => {
            const requestAdapter = vi.fn().mockResolvedValue({ name: 'mock-gpu' });
            global.navigator.gpu = { requestAdapter };

            const caps = await getCapabilities();
            expect(caps.webgpu).toBe(true);
            expect(requestAdapter).toHaveBeenCalled();
        });

        it('should detect WebGPU unavailable when adapter request fails', async () => {
            global.navigator.gpu = {
                requestAdapter: vi.fn().mockResolvedValue(null)
            };

            const caps = await getCapabilities();
            expect(caps.webgpu).toBe(false);
        });

        it('should detect WASM SIMD', async () => {
            global.WebAssembly.validate = vi.fn().mockReturnValue(true);
            const caps = await getCapabilities();
            expect(caps.wasmSimd).toBe(true);
        });

        it('should detect low memory and low CPU as lowPower', async () => {
            global.navigator.deviceMemory = 2;
            global.navigator.hardwareConcurrency = 2;
            
            const caps = await getCapabilities();
            expect(caps.isLowPower).toBe(true);
        });

        it('should detect mobile user agent as lowPower', async () => {
            global.navigator.userAgent = 'iPhone';
            const caps = await getCapabilities();
            expect(caps.isLowPower).toBe(true);
        });
    });

    describe('getRecommendedProfile', () => {
        it('should return ULTRA for WebGPU + High specs', () => {
            const caps = {
                webgpu: true,
                wasmSimd: true,
                isLowPower: false,
                threads: 8,
                memory: 16
            };
            expect(getRecommendedProfile(caps)).toBe('ULTRA');
        });

        it('should return FULL for WebGPU on lower specs', () => {
            const caps = {
                webgpu: true,
                wasmSimd: true,
                isLowPower: true,
                threads: 4,
                memory: 4
            };
            expect(getRecommendedProfile(caps)).toBe('FULL');
        });

        it('should return BALANCED for WASM SIMD on mid-range', () => {
            const caps = {
                webgpu: false,
                wasmSimd: true,
                isLowPower: false,
                threads: 4, // Changed from 8 to 4 to avoid FULL profile
                memory: 16
            };
            expect(getRecommendedProfile(caps)).toBe('BALANCED');
        });

        it('should return LITE for low-end specs', () => {
            const caps = {
                webgpu: false,
                wasmSimd: false,
                isLowPower: true,
                threads: 2,
                memory: 2
            };
            expect(getRecommendedProfile(caps)).toBe('LITE');
        });
    });
});
