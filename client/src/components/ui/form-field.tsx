import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle } from "lucide-react";

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  success?: boolean;
  successMessage?: string;
  children?: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  required = false,
  hint,
  success = false,
  successMessage,
  children,
  className,
}: FormFieldProps) {
  const hasError = !!error;
  const hasSuccess = success && !hasError;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          className={cn(
            "text-sm font-medium",
            hasError && "text-destructive",
            hasSuccess && "text-green-600",
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        {children}

        {/* Error/Success Icon */}
        {(hasError || hasSuccess) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
            {hasSuccess && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-center gap-2 text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {hasSuccess && successMessage && (
        <div className="flex items-center gap-2 text-sm text-green-600 animate-in slide-in-from-top-1 duration-200">
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Hint */}
      {hint && !hasError && !hasSuccess && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// Enhanced Input with validation states
export interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  successMessage?: string;
  hint?: string;
  required?: boolean;
}

export const ValidatedInput = React.forwardRef<
  HTMLInputElement,
  ValidatedInputProps
>(
  (
    {
      label,
      error,
      success,
      successMessage,
      hint,
      required,
      className,
      ...props
    },
    ref,
  ) => {
    const hasError = !!error;
    const hasSuccess = success && !hasError;

    return (
      <FormField
        label={label}
        error={error}
        required={required}
        hint={hint}
        success={hasSuccess}
        successMessage={successMessage}
      >
        <Input
          ref={ref}
          className={cn(
            hasError &&
              "border-destructive focus-visible:ring-destructive pr-10",
            hasSuccess && "border-green-600 focus-visible:ring-green-600 pr-10",
            className,
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${props.id}-error`
              : hint
                ? `${props.id}-hint`
                : undefined
          }
          {...props}
        />
      </FormField>
    );
  },
);
ValidatedInput.displayName = "ValidatedInput";

// Enhanced Textarea with validation states
export interface ValidatedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  successMessage?: string;
  hint?: string;
  required?: boolean;
}

export const ValidatedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  ValidatedTextareaProps
>(
  (
    {
      label,
      error,
      success,
      successMessage,
      hint,
      required,
      className,
      ...props
    },
    ref,
  ) => {
    const hasError = !!error;
    const hasSuccess = success && !hasError;

    return (
      <FormField
        label={label}
        error={error}
        required={required}
        hint={hint}
        success={hasSuccess}
        successMessage={successMessage}
      >
        <Textarea
          ref={ref}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive",
            hasSuccess && "border-green-600 focus-visible:ring-green-600",
            className,
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError
              ? `${props.id}-error`
              : hint
                ? `${props.id}-hint`
                : undefined
          }
          {...props}
        />
      </FormField>
    );
  },
);
ValidatedTextarea.displayName = "ValidatedTextarea";

// Character counter component
export interface CharacterCounterProps {
  current: number;
  max?: number;
  className?: string;
}

export function CharacterCounter({
  current,
  max,
  className,
}: CharacterCounterProps) {
  if (!max) return null;

  const percentage = (current / max) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = current > max;

  return (
    <div className={cn("text-xs", className)}>
      <span
        className={cn(
          "tabular-nums",
          isOverLimit && "text-destructive",
          isNearLimit && !isOverLimit && "text-warning",
          !isNearLimit && "text-muted-foreground",
        )}
      >
        {current}
      </span>
      {max && <span className="text-muted-foreground">/{max}</span>}
    </div>
  );
}

// Form section component for better organization
export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium leading-none tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
