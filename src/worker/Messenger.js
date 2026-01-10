/**
 * Abstraction layer for Web Worker communication
 * Allows for easier testing and decoupling from self.postMessage
 */

export class Messenger {
  constructor(target) {
    this.target = target;
  }

  /**
   * Send a message to the target
   * @param {Object} message - The message to send
   */
  postMessage(message) {
    if (this.target && typeof this.target.postMessage === 'function') {
      this.target.postMessage(message);
    } else {
      console.warn('Messenger target does not have postMessage method', this.target);
    }
  }

  /**
   * Set up message listener
   * @param {Function} handler - Message handler function
   */
  onMessage(handler) {
    if (this.target && typeof this.target.addEventListener === 'function') {
      this.target.addEventListener('message', handler);
    } else if (this.target && typeof this.target.onmessage === 'function') {
      // For Web Workers
      this.target.onmessage = handler;
    }
  }
}

/**
 * Concrete implementation for Web Workers
 */
export class WorkerMessenger extends Messenger {
  static instance = null;

  constructor() {
    if (WorkerMessenger.instance) {
      return WorkerMessenger.instance;
    }
    super(self);
    WorkerMessenger.instance = this;
  }

  static getInstance() {
    if (!WorkerMessenger.instance) {
      WorkerMessenger.instance = new WorkerMessenger();
    }
    return WorkerMessenger.instance;
  }
}

/**
 * Mock messenger for testing purposes
 */
export class MockMessenger {
  constructor() {
    this.messages = [];
    this.handlers = [];
  }

  postMessage(message) {
    this.messages.push(message);
  }

  onMessage(handler) {
    this.handlers.push(handler);
  }

  /**
   * Simulate receiving a message for testing
   * @param {Object} message - Message to simulate receiving
   */
  simulateReceive(message) {
    this.handlers.forEach(handler => {
      if (handler) {
        handler({ data: message });
      }
    });
  }

  getMessages() {
    return [...this.messages];
  }

  clearMessages() {
    this.messages = [];
  }
}