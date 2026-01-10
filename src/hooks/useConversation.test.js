import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversation } from './useConversation';
import { eventBus, EVENTS } from '../utils/eventBus';

vi.mock('../conversationManager', () => ({
  getConversationHistory: vi.fn(() => [])
}));

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useConversation());
    expect(result.current.history).toEqual([]);
    expect(result.current.conversationTurns).toEqual([]);
  });

  it('should add messages to history', () => {
    const { result } = renderHook(() => useConversation());
    
    act(() => {
      result.current.addMessage('user', 'hello');
    });
    
    expect(result.current.history).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('should update conversation turns when event is received', () => {
    const { result } = renderHook(() => useConversation());
    const newTurns = [{ role: 'user', content: 'test turn' }];
    
    act(() => {
      eventBus.emit(EVENTS.CONVERSATION_UPDATED, { turns: newTurns });
    });
    
    expect(result.current.conversationTurns).toEqual(newTurns);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useConversation());
    
    act(() => {
      result.current.addMessage('user', 'hello');
      result.current.clearHistory();
    });
    
    expect(result.current.history).toEqual([]);
    expect(result.current.conversationTurns).toEqual([]);
  });
});
