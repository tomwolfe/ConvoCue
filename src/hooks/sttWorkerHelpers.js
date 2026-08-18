/**
 * STT Worker helpers - pure logic for STT worker creation and message handling
 */

export const createWorker = () => {
    const worker = new Worker(new URL('./sttWorker.js', import.meta.url), { type: 'module' });
    const monitor = new ReliabilityMonitor(worker, 'STT', {
        onFailure: () => { /* handled by useML */ },
        onRecovered: () => { /* handled by useML */ },
        rebootOnFailure: true,
        onReboot: () => { /* handled by useML */ }
    });

    return { worker, monitor };
};

export const handleSTTMessage = (monitor, setSttProgress, setSttStage) => (event) => {
    if (monitor.handleMessage(event)) return;

    const { type, text, progress, status: stat, error, taskId, loadTime, stage } = event.data;
    switch (type) {
        case 'progress':
            setSttProgress(progress);
            if (stage) setSttStage(stage);
            break;
        case 'ready':
            // setSttReady handled by useML
            if (loadTime !== undefined) { /* tracked by useML */ }
            break;
        case 'stt_result':
            // text forwarded to parent
            break;
        case 'error': console.error('STT Worker error:', error); break;
    }
};