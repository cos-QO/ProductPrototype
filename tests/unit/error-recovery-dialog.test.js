/**
 * ErrorRecoveryDialog UI Component Testing
 * Tests the ErrorRecoveryDialog React component functionality
 * 
 * TESTING SCOPE:
 * - Component rendering and state management
 * - User interactions and event handling
 * - Error display and navigation
 * - Fix operations and progress tracking
 * - API integration and error handling
 */

const { render, screen, fireEvent, waitFor, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const React = require('react');

// Mock the API request function
const mockApiRequest = jest.fn();
jest.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  SkipForward: () => <div data-testid="skip-icon" />
}));

// We'll need to import the component after mocking
const ErrorRecoveryDialog = require('../../client/src/components/bulk-upload/components/ErrorRecoveryDialog').ErrorRecoveryDialog;

// Test helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('ErrorRecoveryDialog Component', () => {
  const mockErrors = [
    {
      recordIndex: 0,
      field: 'price',
      value: 'invalid_price',
      rule: 'type',
      severity: 'error',
      message: 'Price must be a valid number',
      suggestion: 'Enter a numeric value like 19.99',
      autoFix: {
        action: 'default_value',
        newValue: '0.00',
        confidence: 0.8
      }
    },
    {
      recordIndex: 1,
      field: 'email',
      value: ' test@example.com ',
      rule: 'format',
      severity: 'warning',
      message: 'Email has leading/trailing spaces',
      suggestion: 'Remove extra spaces',
      autoFix: {
        action: 'trim_whitespace',
        newValue: 'test@example.com',
        confidence: 0.95
      }
    },
    {
      recordIndex: 2,
      field: 'name',
      value: '',
      rule: 'required',
      severity: 'error',
      message: 'Name is required',
      suggestion: 'Please provide a product name'
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    errors: mockErrors,
    sessionId: 'test-session-123',
    onErrorsResolved: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockClear();
  });

  describe('Component Rendering', () => {
    test('should render dialog when open', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Error Recovery')).toBeInTheDocument();
      expect(screen.getByText('Fix Data Validation Errors')).toBeInTheDocument();
    });

    test('should not render dialog when closed', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, { ...defaultProps, isOpen: false }),
        { wrapper: Wrapper }
      );

      expect(screen.queryByText('Error Recovery')).not.toBeInTheDocument();
    });

    test('should display error count and statistics', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByText('3 errors found')).toBeInTheDocument();
      expect(screen.getByText(/2 can be auto-fixed/)).toBeInTheDocument();
    });

    test('should group errors by type', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Should show different error groups
      expect(screen.getByText(/type errors/)).toBeInTheDocument();
      expect(screen.getByText(/format errors/)).toBeInTheDocument();
      expect(screen.getByText(/required errors/)).toBeInTheDocument();
    });
  });

  describe('Error Display and Navigation', () => {
    test('should display individual error details', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Check if error messages are displayed
      expect(screen.getByText('Price must be a valid number')).toBeInTheDocument();
      expect(screen.getByText('Email has leading/trailing spaces')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    test('should show error severity badges', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Should show severity badges
      expect(screen.getAllByText('ERROR')).toHaveLength(2); // price and name errors
      expect(screen.getByText('WARNING')).toBeInTheDocument(); // email warning
    });

    test('should display auto-fix suggestions when available', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByText('Enter a numeric value like 19.99')).toBeInTheDocument();
      expect(screen.getByText('Remove extra spaces')).toBeInTheDocument();
    });

    test('should allow navigation between error groups', async () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Click on different error groups and verify navigation
      const typeErrorsButton = screen.getByText(/type errors/);
      fireEvent.click(typeErrorsButton);

      await waitFor(() => {
        expect(screen.getByText('Price must be a valid number')).toBeVisible();
      });
    });
  });

  describe('Individual Error Fixing', () => {
    test('should allow manual fix input for individual errors', async () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Find the first error fix input
      const fixInput = screen.getByDisplayValue('invalid_price');
      
      // Change the value
      fireEvent.change(fixInput, { target: { value: '19.99' } });
      
      expect(fixInput.value).toBe('19.99');
    });

    test('should submit individual error fix', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '19.99' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Change the value and submit
      const fixInput = screen.getByDisplayValue('invalid_price');
      fireEvent.change(fixInput, { target: { value: '19.99' } });

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/recovery/test-session-123/fix-single', {
          recordIndex: 0,
          field: 'price',
          newValue: '19.99'
        });
      });
    });

    test('should handle fix API errors gracefully', async () => {
      mockApiRequest.mockRejectedValue(new Error('API Error'));

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Fix Failed',
          description: expect.stringContaining('API Error'),
          variant: 'destructive'
        });
      });
    });

    test('should update UI after successful fix', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '19.99' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error Fixed',
          description: 'Successfully fixed price error',
          variant: 'default'
        });
      });
    });
  });

  describe('Auto-Fix Functionality', () => {
    test('should display auto-fix buttons for fixable errors', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Should show auto-fix buttons for errors with autoFix suggestions
      const autoFixButtons = screen.getAllByText('Auto-Fix');
      expect(autoFixButtons.length).toBeGreaterThan(0);
    });

    test('should apply auto-fix with suggested value', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '0.00' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const autoFixButton = screen.getAllByText('Auto-Fix')[0];
      fireEvent.click(autoFixButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/recovery/test-session-123/fix-single', {
          recordIndex: 0,
          field: 'price',
          newValue: '0.00'
        });
      });
    });

    test('should show confidence level for auto-fix suggestions', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Check for confidence indicators
      expect(screen.getByText('80% confident')).toBeInTheDocument();
      expect(screen.getByText('95% confident')).toBeInTheDocument();
    });
  });

  describe('Bulk Error Fixing', () => {
    test('should allow selection of multiple errors for bulk fixing', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Should have checkboxes for bulk selection
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    test('should enable bulk fix button when errors are selected', async () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Select multiple errors
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      const bulkFixButton = screen.getByText('Fix Selected');
      expect(bulkFixButton).not.toBeDisabled();
    });

    test('should submit bulk fix request', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecords: [
          { price: '0.00' },
          { email: 'test@example.com' }
        ]
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Select errors and submit bulk fix
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      const bulkFixButton = screen.getByText('Fix Selected');
      fireEvent.click(bulkFixButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/recovery/test-session-123/fix-bulk', {
          fixes: expect.arrayContaining([
            expect.objectContaining({ recordIndex: 0, field: 'price' }),
            expect.objectContaining({ recordIndex: 1, field: 'email' })
          ])
        });
      });
    });
  });

  describe('Skip and Continue Functionality', () => {
    test('should allow skipping individual errors', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const skipButtons = screen.getAllByText('Skip');
      expect(skipButtons.length).toBeGreaterThan(0);
    });

    test('should update error count when errors are skipped', async () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const skipButton = screen.getAllByText('Skip')[0];
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(screen.getByText('2 errors found')).toBeInTheDocument();
      });
    });

    test('should enable continue button when all errors are resolved or skipped', async () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Skip all errors
      const skipButtons = screen.getAllByText('Skip');
      skipButtons.forEach(button => fireEvent.click(button));

      await waitFor(() => {
        const continueButton = screen.getByText('Continue Import');
        expect(continueButton).not.toBeDisabled();
      });
    });
  });

  describe('Progress Tracking', () => {
    test('should display progress bar', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    test('should update progress as errors are resolved', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '19.99' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Initial progress should be 0%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');

      // Fix one error
      const fixButton = screen.getAllByText('Fix')[0];
      fireEvent.click(fixButton);

      await waitFor(() => {
        // Progress should increase (1 out of 3 errors fixed = ~33%)
        expect(progressBar).toHaveAttribute('aria-valuenow', expect.stringMatching(/3[0-9]/));
      });
    });

    test('should show completion when all errors are resolved', async () => {
      const singleErrorProps = {
        ...defaultProps,
        errors: [mockErrors[0]] // Only one error
      };

      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '19.99' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, singleErrorProps),
        { wrapper: Wrapper }
      );

      const fixButton = screen.getByText('Fix');
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(screen.getByText('All errors resolved!')).toBeInTheDocument();
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      });
    });
  });

  describe('Error Summary and Statistics', () => {
    test('should display error breakdown by type', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByText(/3 total errors/)).toBeInTheDocument();
      expect(screen.getByText(/2 errors/)).toBeInTheDocument(); // Critical errors count
      expect(screen.getByText(/1 warning/)).toBeInTheDocument(); // Warning count
    });

    test('should update statistics as errors are resolved', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '19.99' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Fix one error
      const fixButton = screen.getAllByText('Fix')[0];
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(screen.getByText(/2 errors found/)).toBeInTheDocument(); // Updated count
      });
    });
  });

  describe('Component State Management', () => {
    test('should handle empty errors array', () => {
      const emptyProps = {
        ...defaultProps,
        errors: []
      };

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, emptyProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByText('No errors to fix')).toBeInTheDocument();
    });

    test('should handle null or undefined errors', () => {
      const nullProps = {
        ...defaultProps,
        errors: null
      };

      const Wrapper = createWrapper();
      
      expect(() => {
        render(
          React.createElement(ErrorRecoveryDialog, nullProps),
          { wrapper: Wrapper }
        );
      }).not.toThrow();
    });

    test('should call onClose when dialog is closed', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should call onErrorsResolved when errors are fixed', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        fixedRecord: { price: '19.99' }
      });

      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      const fixButton = screen.getAllByText('Fix')[0];
      fireEvent.click(fixButton);

      await waitFor(() => {
        expect(defaultProps.onErrorsResolved).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
    });

    test('should support keyboard navigation', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      // Should have focusable elements
      const buttons = screen.getAllByRole('button');
      const inputs = screen.getAllByRole('textbox');
      
      expect(buttons.length + inputs.length).toBeGreaterThan(0);
    });

    test('should have proper heading structure', () => {
      const Wrapper = createWrapper();
      
      render(
        React.createElement(ErrorRecoveryDialog, defaultProps),
        { wrapper: Wrapper }
      );

      expect(screen.getByRole('heading', { level: 2, name: /error recovery/i })).toBeInTheDocument();
    });
  });
});