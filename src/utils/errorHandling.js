/**
 * Comprehensive error handling utilities
 */

/**
 * Creates a standardized error object with additional context
 * @param {string|Error} error - The error to wrap
 * @param {string} context - Context where the error occurred
 * @param {Object} additionalData - Additional data to include with the error
 * @returns {Object} Standardized error object
 */
export const createError = (error, context, additionalData = {}) => {
  const errorObj = {
    message: typeof error === 'string' ? error : (error?.message || 'Unknown error'),
    stack: typeof error === 'string' ? null : error?.stack,
    context,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  // Log the error for debugging
  console.error(`[${context}] Error:`, errorObj);
  
  return errorObj;
};

/**
 * Validates and sanitizes user input
 * @param {any} input - Input to validate
 * @param {string} type - Expected type ('string', 'number', 'array', 'object')
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with isValid flag and sanitized value
 */
export const validateInput = (input, type, options = {}) => {
  const result = {
    isValid: false,
    value: null,
    errors: []
  };

  // Type validation
  const actualType = Array.isArray(input) ? 'array' : typeof input;
  if (type !== 'any' && actualType !== type) {
    result.errors.push(`Expected type '${type}', got '${actualType}'`);
    return result;
  }

  switch (type) {
    case 'string':
      if (typeof input === 'string') {
        let sanitized = input;
        
        // Length validation
        if (options.maxLength && sanitized.length > options.maxLength) {
          result.errors.push(`String exceeds maximum length of ${options.maxLength}`);
        }
        
        if (options.minLength && sanitized.length < options.minLength) {
          result.errors.push(`String is shorter than minimum length of ${options.minLength}`);
        }
        
        // Pattern validation
        if (options.pattern && !options.pattern.test(sanitized)) {
          result.errors.push(`String does not match required pattern`);
        }
        
        // Sanitize the string
        sanitized = sanitized.trim();
        if (options.sanitize) {
          sanitized = sanitized.replace(/[<>]/g, '');
        }
        
        result.isValid = result.errors.length === 0;
        result.value = sanitized;
      }
      break;
      
    case 'number':
      if (typeof input === 'number' && !isNaN(input)) {
        if (options.max !== undefined && input > options.max) {
          result.errors.push(`Number exceeds maximum value of ${options.max}`);
        }
        
        if (options.min !== undefined && input < options.min) {
          result.errors.push(`Number is below minimum value of ${options.min}`);
        }
        
        result.isValid = result.errors.length === 0;
        result.value = input;
      }
      break;
      
    case 'array':
      if (Array.isArray(input)) {
        if (options.maxLength && input.length > options.maxLength) {
          result.errors.push(`Array exceeds maximum length of ${options.maxLength}`);
        }
        
        if (options.minLength && input.length < options.minLength) {
          result.errors.push(`Array is shorter than minimum length of ${options.minLength}`);
        }
        
        // Validate array items if itemValidator is provided
        if (options.itemValidator) {
          for (let i = 0; i < input.length; i++) {
            const itemValidation = validateInput(input[i], options.itemValidator.type, options.itemValidator.options);
            if (!itemValidation.isValid) {
              result.errors.push(`Item at index ${i} is invalid: ${itemValidation.errors.join(', ')}`);
            }
          }
        }
        
        result.isValid = result.errors.length === 0;
        result.value = input;
      }
      break;
      
    case 'object':
      if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
        if (options.requiredKeys) {
          for (const key of options.requiredKeys) {
            if (!(key in input)) {
              result.errors.push(`Missing required key: ${key}`);
            }
          }
        }
        
        result.isValid = result.errors.length === 0;
        result.value = input;
      }
      break;
      
    case 'any':
      result.isValid = true;
      result.value = input;
      break;
  }

  return result;
};

/**
 * Safe execution wrapper that catches errors and returns a result object
 * @param {Function} fn - Function to execute
 * @param {string} context - Context for error reporting
 * @returns {Object} Result object with success flag and data or error
 */
export const safeExecute = (fn, context = 'safeExecute') => {
  try {
    const result = fn();
    return {
      success: true,
      data: result,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: createError(error, context)
    };
  }
};

/**
 * Async safe execution wrapper for async functions
 * @param {Function} fn - Async function to execute
 * @param {string} context - Context for error reporting
 * @returns {Promise<Object>} Promise that resolves to result object
 */
export const safeExecuteAsync = async (fn, context = 'safeExecuteAsync') => {
  try {
    const result = await fn();
    return {
      success: true,
      data: result,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: createError(error, context)
    };
  }
};

/**
 * Validates configuration objects
 * @param {Object} config - Configuration object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result
 */
export const validateConfig = (config, schema) => {
  const result = {
    isValid: true,
    errors: []
  };

  for (const [key, validation] of Object.entries(schema)) {
    const value = config[key];
    
    if (validation.required && (value === undefined || value === null)) {
      result.isValid = false;
      result.errors.push(`Required configuration key '${key}' is missing`);
      continue;
    }
    
    if (value !== undefined && validation.type && typeof value !== validation.type) {
      result.isValid = false;
      result.errors.push(`Configuration key '${key}' has wrong type. Expected ${validation.type}, got ${typeof value}`);
    }
    
    if (value !== undefined && validation.validator && typeof validation.validator === 'function') {
      const validatorResult = validation.validator(value);
      if (!validatorResult.isValid) {
        result.isValid = false;
        result.errors.push(`Configuration key '${key}' is invalid: ${validatorResult.errors.join(', ')}`);
      }
    }
  }

  return result;
};

/**
 * Logs errors with additional context
 * @param {Error|Object|string} error - Error to log
 * @param {Object} context - Additional context to log with the error
 */
export const logError = (error, context = {}) => {
  const errorObj = createError(error, 'general', context);
  console.error('Application Error:', errorObj);
  
  // In a real application, you might want to send this to an error tracking service
  // For now, we'll just log it
};