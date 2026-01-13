import React from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const VAD = ({ onSpeechEnd, isReady, status }) => {
    const vad = useMicVAD({
        startOnLoad: false,
        onSpeechEnd: (audio) => {
            onSpeechEnd(new Float32Array(audio));
        },
        workletURL: "/vad.worklet.bundle.min.js",
        modelURL: "/silero_vad_v5.onnx",
        onnxWASMPaths: "/",
    });

    const toggleMic = () => {
        if (vad.listening) {
            vad.pause();
        } else {
            vad.start();
        }
    };

    return (
        <div className="vad-controls">
            <button 
                onClick={toggleMic} 
                disabled={!isReady}
                className={`btn-mic ${vad.listening ? 'active' : ''}`}
            >
                {vad.listening ? <Mic size={24} /> : <MicOff size={24} />}
                <span>{vad.listening ? 'Listening...' : 'Start Listening'}</span>
            </button>
            <div className="status-indicator">
                {status === 'Loading Models...' && <Loader2 className="animate-spin" size={16} />}
                <span>{status}</span>
            </div>
            {vad.listening && (
                <div className="audio-visualizer-simple">
                    <div className="wave-animation"></div>
                </div>
            )}
        </div>
    );
};

export default VAD;
