import { describe, it, expect, vi } from 'vitest';
import { eventBus, EVENTS } from './eventBus';

describe('eventBus', () => {
  it('should emit and receive events', () => {
    const handler = vi.fn();
    const data = { test: 'data' };
    
    eventBus.on('test:event', handler);
    eventBus.emit('test:event', data);
    
    expect(handler).toHaveBeenCalledWith(data);
    
    eventBus.off('test:event', handler);
  });

  it('should handle multiple listeners', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    eventBus.on('test:multiple', handler1);
    eventBus.on('test:multiple', handler2);
    
    eventBus.emit('test:multiple', 'hello');
    
    expect(handler1).toHaveBeenCalledWith('hello');
    expect(handler2).toHaveBeenCalledWith('hello');
    
    eventBus.off('test:multiple', handler1);
    eventBus.off('test:multiple', handler2);
  });

  it('should not call removed listeners', () => {
    const handler = vi.fn();
    
    eventBus.on('test:removed', handler);
    eventBus.off('test:removed', handler);
    eventBus.emit('test:removed', 'data');
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('should use consistent event names from EVENTS constant', () => {
    expect(EVENTS.CONVERSATION_UPDATED).toBe('convocue:conversation_updated');
    expect(EVENTS.PREFERENCES_CHANGED).toBe('convocue:preferences_changed');
    expect(EVENTS.SETTINGS_CHANGED).toBe('convocue:settings_changed');
    expect(EVENTS.FEEDBACK_SUBMITTED).toBe('convocue:feedback_submitted');
  });
});
