/**
 * Reliability Monitor for Worker Health
 * Implements Heartbeat, Timeout (15s), and Auto-Retry logic.
 */

export class ReliabilityMonitor {
    constructor(worker, name, options = {}) {
        this.worker = worker;
        this.name = name;
        this.options = options;
        this.timeout = options.timeout || 15000;
        this.heartbeatInterval = options.heartbeatInterval || 5000;
        this.maxRetries = options.maxRetries || 3;
        
        this.pendingTasks = new Map();
        this.heartbeatTimer = null;
        this.lastHeartbeat = Date.now();
        this.isHealthy = true;
        this.onFailure = options.onFailure || (() => {});
        this.onRecovered = options.onRecovered || (() => {});

        this.startHeartbeat();
    }

    startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            
            // Check if last heartbeat was too long ago
            if (now - this.lastHeartbeat > this.timeout) {
                if (this.isHealthy) {
                    console.error(`[ReliabilityMonitor] ${this.name} worker heartbeat timeout.`);
                    this.isHealthy = false;
                    this.onFailure({ type: 'heartbeat_timeout' });
                    
                    // MISSION: Reset/Reboot worker if heartbeat fails
                    if (this.options.rebootOnFailure) {
                        console.log(`[ReliabilityMonitor] Rebooting ${this.name} worker...`);
                        this.reboot();
                    }
                }
            }

            // Check pending tasks for timeouts
            for (const [taskId, task] of this.pendingTasks.entries()) {
                if (now - task.startTime > this.timeout) {
                    console.warn(`[ReliabilityMonitor] Task ${taskId} in ${this.name} timed out.`);
                    task.reject(new Error(`Task ${taskId} timed out after ${this.timeout}ms`));
                    this.pendingTasks.delete(taskId);
                    
                    if (task.retries < this.maxRetries) {
                        console.log(`[ReliabilityMonitor] Retrying task ${taskId} (${task.retries + 1}/${this.maxRetries})`);
                        this.executeTask(task.message, task.resolve, task.reject, task.retries + 1);
                    } else if (this.options.rebootOnFailure) {
                        // Consistently failing tasks also trigger a reboot
                        this.reboot();
                    }
                }
            }

            // Send heartbeat message
            try {
                this.worker.postMessage({ type: 'heartbeat', timestamp: now });
            } catch (err) {
                console.error(`[ReliabilityMonitor] Failed to send heartbeat to ${this.name}:`, err);
            }
        }, this.heartbeatInterval);
    }

    reboot() {
        if (this.options.onReboot) {
            this.options.onReboot();
        }
    }

    handleMessage(event) {
        const { type, taskId, timestamp } = event.data;

        if (type === 'heartbeat_ack') {
            this.lastHeartbeat = Date.now();
            if (!this.isHealthy) {
                console.log(`[ReliabilityMonitor] ${this.name} worker recovered.`);
                this.isHealthy = true;
                this.onRecovered();
            }
            return true;
        }

        if (taskId && this.pendingTasks.has(taskId)) {
            const task = this.pendingTasks.get(taskId);
            this.pendingTasks.delete(taskId);
            task.resolve(event.data);
            return true;
        }

        return false;
    }

    postMessage(message) {
        return new Promise((resolve, reject) => {
            const taskId = message.taskId || Date.now();
            this.executeTask({ ...message, taskId }, resolve, reject);
        });
    }

    executeTask(message, resolve, reject, retries = 0) {
        const taskId = message.taskId;
        this.pendingTasks.set(taskId, {
            message,
            resolve,
            reject,
            startTime: Date.now(),
            retries
        });

        try {
            this.worker.postMessage(message);
        } catch (err) {
            this.pendingTasks.delete(taskId);
            reject(err);
        }
    }

    terminate() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.pendingTasks.clear();
    }
}
