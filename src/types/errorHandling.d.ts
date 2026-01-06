// Type definitions for error handling utilities

interface ErrorObject {
  message: string;
  stack?: string;
  context: string;
  timestamp: string;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  value: any;
  errors: string[];
}

interface ExecutionResult<T = any> {
  success: boolean;
  data: T | null;
  error: ErrorObject | null;
}

interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
  max?: number;
  min?: number;
  requiredKeys?: string[];
  itemValidator?: {
    type: string;
    options?: ValidationOptions;
  };
}

interface ConfigSchema {
  [key: string]: {
    required?: boolean;
    type?: string;
    validator?: (value: any) => ValidationResult;
  };
}