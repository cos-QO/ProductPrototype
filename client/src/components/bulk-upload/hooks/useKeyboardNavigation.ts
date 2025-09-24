import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

/**
 * Custom hook for keyboard navigation in the bulk upload wizard
 * Implements WCAG 2.1 guidelines for keyboard accessibility
 */
export const useKeyboardNavigation = ({
  isOpen,
  currentStep,
  totalSteps,
  canGoBack,
  canProceed,
  onNext,
  onBack,
  onClose,
}: UseKeyboardNavigationProps) => {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    // Handle different key combinations
    switch (event.key) {
      case 'Escape':
        // Always allow escape to close
        event.preventDefault();
        onClose();
        break;
        
      case 'ArrowLeft':
        // Go to previous step (Ctrl/Cmd + Left Arrow)
        if ((event.ctrlKey || event.metaKey) && canGoBack) {
          event.preventDefault();
          onBack();
        }
        break;
        
      case 'ArrowRight':
        // Go to next step (Ctrl/Cmd + Right Arrow)
        if ((event.ctrlKey || event.metaKey) && canProceed && currentStep < totalSteps - 1) {
          event.preventDefault();
          onNext();
        }
        break;
        
      case 'Enter':
        // Proceed to next step if focused on navigation button
        if (event.target instanceof HTMLButtonElement) {
          const button = event.target;
          if (button.dataset.action === 'next' && canProceed) {
            event.preventDefault();
            onNext();
          } else if (button.dataset.action === 'back' && canGoBack) {
            event.preventDefault();
            onBack();
          }
        }
        break;
        
      case 'Tab':
        // Trap focus within the modal/drawer
        trapFocus(event);
        break;
        
      case 'F1':
        // Show help (prevent browser help)
        event.preventDefault();
        // Could trigger help dialog or announcement
        announceHelp();
        break;
    }
  }, [isOpen, currentStep, totalSteps, canGoBack, canProceed, onNext, onBack, onClose]);

  // Focus trapping function
  const trapFocus = (event: KeyboardEvent) => {
    const modal = document.querySelector('[role="dialog"], [role="drawer"]') as HTMLElement;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      // Shift + Tab on first element, focus last
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      // Tab on last element, focus first
      event.preventDefault();
      firstElement?.focus();
    }
  };

  // Announce help information
  const announceHelp = () => {
    const helpText = `
      Bulk Upload Wizard Keyboard Shortcuts:
      - Escape: Close wizard
      - Ctrl/Cmd + Left Arrow: Previous step
      - Ctrl/Cmd + Right Arrow: Next step
      - Tab: Navigate between elements
      - Enter: Activate focused button
      - F1: Repeat this help message
      Step ${currentStep + 1} of ${totalSteps}
    `;
    
    announceToScreenReader(helpText);
  };

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Set up keyboard event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Announce wizard opening
      announceToScreenReader(
        `Bulk Upload Wizard opened. Step ${currentStep + 1} of ${totalSteps}. Press F1 for help.`
      );
      
      // Focus management
      const firstFocusable = document.querySelector(
        '[role="dialog"] button, [role="drawer"] button'
      ) as HTMLElement;
      
      if (firstFocusable) {
        // Small delay to ensure modal is rendered
        setTimeout(() => firstFocusable.focus(), 100);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown, currentStep, totalSteps]);

  // Announce step changes
  useEffect(() => {
    if (isOpen) {
      const stepNames = ['File Upload', 'Field Mapping', 'Data Preview', 'Import Execution'];
      const stepName = stepNames[currentStep] || `Step ${currentStep + 1}`;
      
      announceToScreenReader(
        `Navigated to ${stepName}. Step ${currentStep + 1} of ${totalSteps}.`
      );
    }
  }, [currentStep, isOpen, totalSteps]);

  // Return utilities for components to use
  return {
    announceToScreenReader,
    announceHelp,
  };
};

export default useKeyboardNavigation;