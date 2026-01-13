import React from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { Mic, MicOff, Loader2, AlertTriangle, RotateCcw, Settings, Chrome, Firefox, Apple } from 'lucide-react';

const VAD = ({ onSpeechEnd, isReady, status }) => {
    const [vadError, setVadError] = React.useState(null);
    const [permissionDenied, setPermissionDenied] = React.useState(false);
    const [showDetailedHelp, setShowDetailedHelp] = React.useState(false);

    const vad = useMicVAD({
        startOnLoad: false,
        onSpeechEnd: (audio) => {
            onSpeechEnd(new Float32Array(audio));
        },
        onError: (err) => {
            console.error('VAD Error:', err);

            // Check for permission-related errors
            if (err.name === 'NotAllowedError' || err.message.includes('permission') || err.message.includes('denied')) {
                setPermissionDenied(true);
                setVadError('Microphone access denied. Please allow microphone permission in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.message.includes('device')) {
                setVadError('No microphone found. Please connect a microphone and refresh the page.');
            } else if (err.name === 'NotReadableError' || err.message.includes('hardware')) {
                setVadError('Microphone hardware error. Please check your microphone settings.');
            } else {
                setVadError(err.message || 'Microphone error occurred');
            }
        },
        workletURL: "/vad.worklet.bundle.min.js",
        modelURL: "/silero_vad_v5.onnx",
        model: "v5",
        onnxWASMPaths: "/",
    });

    React.useEffect(() => {
        if (isReady && !vad.listening && !vad.loading && !vadError) {
            vad.start();
        }
    }, [isReady, vad.loading, vadError]);

    const requestPermission = () => {
        setPermissionDenied(false);
        setVadError(null);

        // Request microphone permission explicitly
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
                // Restart VAD after getting permission
                vad.start();
            })
            .catch(err => {
                console.error('Permission request failed:', err);
                setVadError('Microphone permission still denied. Please enable it in browser settings.');
            });
    };

    const getBrowserInstructions = () => {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('chrome')) {
            return {
                icon: <Chrome size={16} />,
                name: 'Chrome',
                steps: [
                    'Click the lock icon 🔒 in the address bar',
                    'Find "Microphone" and click "Allow"',
                    'Refresh the page'
                ]
            };
        } else if (userAgent.includes('firefox')) {
            return {
                icon: <Firefox size={16} />,
                name: 'Firefox',
                steps: [
                    'Click the shield icon 🛡️ in the address bar',
                    'Find "Permissions" and allow microphone',
                    'Refresh the page'
                ]
            };
        } else if (userAgent.includes('safari')) {
            return {
                icon: <Apple size={16} />,
                name: 'Safari',
                steps: [
                    'Go to Safari → Preferences → Websites → Camera & Microphone',
                    'Find this website and set to "Allow"',
                    'Refresh the page'
                ]
            };
        } else {
            return {
                icon: <Settings size={16} />,
                name: 'Browser',
                steps: [
                    'Click the lock icon 🔒 in the address bar',
                    'Find microphone permissions and click "Allow"',
                    'Refresh the page'
                ]
            };
        }
    };

    const browserInfo = getBrowserInstructions();

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
                disabled={!isReady || permissionDenied}
                className={`btn-mic ${vad.listening ? 'active' : ''} ${permissionDenied ? 'permission-denied' : ''}`}
            >
                {vad.listening ? <Mic size={24} /> : <MicOff size={24} />}
                <span>{vad.listening ? 'Listening...' : permissionDenied ? 'Permission Denied' : 'Start Listening'}</span>
            </button>
            <div className="status-indicator">
                {(status === 'Loading Models...' || status === 'Processing...') && <Loader2 className="animate-spin" size={16} />}
                {vadError && (
                    <div className="error-container">
                        <AlertTriangle size={16} className="error-icon" />
                        <span className="text-error">{vadError}</span>
                    </div>
                )}
                {!vadError && !permissionDenied && <span>{status}</span>}
            </div>
            {permissionDenied && (
                <div className="permission-help">
                    <button className="btn-permission-help" onClick={requestPermission}>
                        <RotateCcw size={14} />
                        <span>Request Permission Again</span>
                    </button>

                    <div className="permission-instructions">
                        <div className="browser-info">
                            <div className="browser-header">
                                {browserInfo.icon}
                                <span>For {browserInfo.name} users:</span>
                            </div>
                            <ol>
                                {browserInfo.steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                ))}
                            </ol>
                        </div>

                        <button
                            className="show-detailed-help"
                            onClick={() => setShowDetailedHelp(!showDetailedHelp)}
                        >
                            {showDetailedHelp ? 'Hide' : 'Show'} detailed instructions
                        </button>

                        {showDetailedHelp && (
                            <div className="detailed-help">
                                <h4>Why do I need to allow microphone access?</h4>
                                <p>
                                    ConvoCue 2 processes your conversations locally on your device to provide real-time suggestions.
                                    No audio is sent to any server - everything happens privately on your computer.
                                </p>

                                <h4>Still having trouble?</h4>
                                <ul>
                                    <li>Check that your microphone is properly connected</li>
                                    <li>Make sure no other apps are using your microphone</li>
                                    <li>Try refreshing the page after allowing permission</li>
                                    <li>Restart your browser if issues persist</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {vad.listening && (
                <div className="audio-visualizer-simple">
                    <div className="wave-animation"></div>
                </div>
            )}
        </div>
    );
};

export default VAD;
