import { useState, useCallback, useMemo } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export interface ValidationState {
  errors: ValidationErrors;
  touched: { [fieldName: string]: boolean };
  isValid: boolean;
  isDirty: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: FieldValidation,
) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isDirty, setIsDirty] = useState(false);

  // Validation function for a single field
  const validateField = useCallback(
    (fieldName: string, value: any): string => {
      const rules = validationRules[fieldName];
      if (!rules) return "";

      // Required validation
      if (
        rules.required &&
        (!value || (typeof value === "string" && !value.trim()))
      ) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }

      // Skip other validations if field is empty and not required
      if (!value && !rules.required) return "";

      // String-specific validations
      if (typeof value === "string") {
        if (rules.minLength && value.length < rules.minLength) {
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${rules.minLength} characters`;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be no more than ${rules.maxLength} characters`;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} format is invalid`;
        }
      }

      // Number-specific validations
      if (typeof value === "number") {
        if (rules.min !== undefined && value < rules.min) {
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${rules.min}`;
        }

        if (rules.max !== undefined && value > rules.max) {
          return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be no more than ${rules.max}`;
        }
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) return customError;
      }

      return "";
    },
    [validationRules],
  );

  // Validate all fields
  const errors = useMemo(() => {
    const newErrors: ValidationErrors = {};

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    return newErrors;
  }, [values, validateField, validationRules]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Update field value
  const setValue = useCallback((fieldName: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);
  }, []);

  // Mark field as touched
  const setFieldTouched = useCallback(
    (fieldName: string, isTouched: boolean = true) => {
      setTouched((prev) => ({ ...prev, [fieldName]: isTouched }));
    },
    [],
  );

  // Get field props for easier integration
  const getFieldProps = useCallback(
    (fieldName: keyof T) => {
      return {
        value: values[fieldName] || "",
        onChange: (
          e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >,
        ) => {
          setValue(fieldName, e.target.value);
        },
        onBlur: () => setFieldTouched(fieldName as string),
        error: touched[fieldName as string]
          ? errors[fieldName as string]
          : undefined,
        hasError: !!(
          touched[fieldName as string] && errors[fieldName as string]
        ),
      };
    },
    [values, setValue, setFieldTouched, touched, errors],
  );

  // Get field error (only if touched)
  const getFieldError = useCallback(
    (fieldName: string) => {
      return touched[fieldName] ? errors[fieldName] : undefined;
    },
    [touched, errors],
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setIsDirty(false);
  }, [initialValues]);

  // Set all values at once
  const setAllValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
    setIsDirty(true);
  }, []);

  // Validate all fields and mark as touched
  const validateAll = useCallback(() => {
    const allTouched: { [key: string]: boolean } = {};
    Object.keys(validationRules).forEach((fieldName) => {
      allTouched[fieldName] = true;
    });
    setTouched(allTouched);
    return isValid;
  }, [validationRules, isValid]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setFieldTouched,
    getFieldProps,
    getFieldError,
    reset,
    setAllValues,
    validateAll,
    validateField,
  };
}

// Predefined validation rules for common fields
export const commonValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },

  productName: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },

  productDescription: {
    maxLength: 1000,
  },

  productPrice: {
    required: true,
    min: 0,
    custom: (value: number) => {
      if (value < 0) return "Price cannot be negative";
      if (value > 1000000) return "Price cannot exceed $1,000,000";
      return null;
    },
  },

  productSKU: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[A-Z0-9-_]+$/,
  },

  productStock: {
    min: 0,
    custom: (value: number) => {
      if (!Number.isInteger(value)) return "Stock must be a whole number";
      return null;
    },
  },
};

export default useFormValidation;
