/**
 * useSTT - STT worker lifecycle, audio buffering, flush logic, STT results
 * Exported functions for useML.js to call.
 * Self-contained - no references to useML.
 */

// Module-owned refs (mutable containers)
const sttWorkerRef = { current: null };
const sttProgressRef = { current: 0 };
const sttStageRef = { current: 'initializing' };
const sttLoadTimeRef = { current: null };
const audioBufferRef = { current: [] };
const flushTimeoutRef = { current: null };

export const initSTT = () => {
    const worker = new Worker(new URL('../core/sttWorker.js', import.meta.url), { type: 'module' });
    sttWorkerRef.current = worker;

    worker.onmessage = (event) => {
        const { type, text, progress, status: stat, error, taskId, loadTime, stage } = event.data;
        switch (type) {
            case 'progress': sttProgressRef.current = progress; if (stage) sttStageRef.current = stage; break;
            case 'ready': break;
            case 'stt_result':
                if (text) {
                    const mlRef = window.__convocue_ml_ref;
                    if (mlRef && mlRef.processText) {
                        mlRef.processText(text);
                    }
                }
                break;
            case 'error': console.error('STT Worker error:', error); break;
        }
    };

    worker.postMessage({ type: 'load' });
};

export const terminateSTT = () => {
    if (sttWorkerRef.current) {
        sttWorkerRef.current.terminate();
        sttWorkerRef.current = null;
    }
    sttStageRef.current = 'initializing';
    sttProgressRef.current = 0;
    sttLoadTimeRef.current = null;
    audioBufferRef.current = [];
    if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
    }
};

export const flushAudioBuffer = () => {
    if (audioBufferRef.current.length === 0) return;

    const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of audioBufferRef.current) {
        combined.set(buffer, offset);
        offset += buffer.length;
    }

    if (sttWorkerRef.current) {
        sttWorkerRef.current.postMessage({ type: 'stt', data: combined }, [combined.buffer]);
    }
    audioBufferRef.current = [];
    if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
    }
};

export const processAudio = (audioData) => {
    if (sttProgressRef.current <= 0 && sttStageRef.current === 'initializing') return;

    audioBufferRef.current.push(audioData);

    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);

    const totalLength = audioBufferRef.current.reduce((acc, curr) => acc + curr.length, 0);
    if (totalLength > 48000) {
        flushAudioBuffer();
    } else {
        flushTimeoutRef.current = setTimeout(flushAudioBuffer, 300);
    }
};

export const sttReady = () => sttProgressRef.current > 0 || sttStageRef.current !== 'initializing';

export const getSTTState = () => ({
    sttProgress: sttProgressRef.current,
    sttStage: sttStageRef.current,
    sttLoadTime: sttLoadTimeRef.current,
    sttReady: sttReady(),
});

export const getSTTWorkerRef = () => sttWorkerRef.current;
export const getAudioBufferRef = () => audioBufferRef;
export const getFlushTimeoutRef = () => flushTimeoutRef;