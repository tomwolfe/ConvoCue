import { describe, it, expect, vi, beforeEach } from 'vitest';
import { secureWipe, clearAllSessionData } from '../utils/privacyHardening';
import * as encryption from '../utils/encryption';

vi.mock('../utils/encryption', () => ({
  secureLocalStorageSet: vi.fn().mockResolvedValue(true)
}));

describe('Privacy Hardening Utilities', () => {
  describe('secureWipe', () => {
    it('should overwrite a string with spaces', () => {
      const data = 'sensitive information';
      const result = secureWipe(data);
      expect(result).toBe(' '.repeat(data.length));
    });

    it('should nullify array elements', () => {
      const data = ['secret1', 'secret2'];
      const result = secureWipe(data);
      expect(result).toEqual([null, null]);
    });

    it('should nullify object properties and return a new object', () => {
      const data = { transcript: 'hello', user: 'tom' };
      const result = secureWipe(data);
      // Original object should remain unchanged
      expect(data.transcript).toBe('hello');
      expect(data.user).toBe('tom');
      // Result should be a new object with null values
      expect(result.transcript).toBe(null);
      expect(result.user).toBe(null);
    });
  });

  describe('clearAllSessionData', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      global.localStorage = { removeItem: vi.fn() };
      global.sessionStorage = { clear: vi.fn() };
    });

    it('should call secureLocalStorageSet for sensitive keys', async () => {
      await clearAllSessionData();
      expect(encryption.secureLocalStorageSet).toHaveBeenCalled();
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('convocue_history_backup');
      expect(global.sessionStorage.clear).toHaveBeenCalled();
    });
  });
});
