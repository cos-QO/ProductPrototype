# QueenOne Design System - Developer Quick Reference Handbook

**Quick Reference**: Daily Development Guide  
**Project**: QueenOne ProductPrototype Design System  
**Version**: 1.0 - Production Ready  
**Audience**: Frontend Developers  
**Purpose**: Instant reference for daily development tasks  

---

## 🚀 QUICK START GUIDE

### Essential Imports

```typescript
// Core Design System Components
import { StatusBadge } from '@/components/ui/status-badge-smart';
import { EnhancedButton } from '@/components/ui/enhanced-button';

// Button Patterns (Recommended)
import { 
  PrimaryActionButton,
  SuccessActionButton, 
  DangerActionButton,
  CallToActionButton 
} from '@/components/ui/button-patterns';

// Status System
import { getStatusDefinition, type StatusKey } from '@/lib/status-system';

// Validation (Development Only)
import { findColorViolations, warnAboutViolations } from '@/lib/design-system-validation';
```

### Basic Usage Examples

```typescript
// ✅ Status Badge - Automatic variant selection
<StatusBadge status="live" />
<StatusBadge status="review" />
<StatusBadge status="out-of-stock" />

// ✅ Enhanced Buttons - Professional patterns
<PrimaryActionButton>Save Product</PrimaryActionButton>
<SuccessActionButton>Publish Now</SuccessActionButton>
<DangerActionButton>Delete Item</DangerActionButton>

// ✅ With loading states
<PrimaryActionButton loading={isSaving}>
  {isSaving ? 'Saving...' : 'Save Product'}
</PrimaryActionButton>
```

---

## 🎨 STATUS BADGE REFERENCE

### All Available Statuses

#### **Product Lifecycle** (`lifecycle` category)
```typescript
<StatusBadge status="draft" />        // Gray - Draft stage
<StatusBadge status="review" />       // Yellow - Under review
<StatusBadge status="live" />         // Green - Published and active
<StatusBadge status="archived" />     // Gray - Archived and hidden
```

#### **Inventory Management** (`inventory` category)
```typescript
<StatusBadge status="in-stock" />     // Green - Available
<StatusBadge status="low-stock" />    // Yellow - Limited quantity
<StatusBadge status="out-of-stock" /> // Red - No inventory
<StatusBadge status="discontinued" /> // Gray - No longer available
```

#### **Processing States** (`processing` category)
```typescript
<StatusBadge status="pending" />      // Blue - Awaiting processing
<StatusBadge status="processing" />   // Blue - Currently processing
<StatusBadge status="completed" />    // Green - Successfully completed
<StatusBadge status="failed" />       // Red - Processing failed
<StatusBadge status="cancelled" />    // Gray - Processing cancelled
```

#### **Validation States** (`validation` category)
```typescript
<StatusBadge status="valid" />                // Green - Passes validation
<StatusBadge status="validation-warning" />   // Yellow - Minor issues
<StatusBadge status="validation-error" />     // Red - Critical errors
<StatusBadge status="requires-review" />      // Blue - Manual review needed
```

#### **Syndication States** (`syndication` category)
```typescript
<StatusBadge status="synced" />       // Green - Successfully synced
<StatusBadge status="syncing" />      // Blue - Currently syncing
<StatusBadge status="sync-error" />   // Red - Sync failed
<StatusBadge status="not-synced" />   // Gray - Not configured
<StatusBadge status="sync-disabled" /> // Gray - Sync disabled
```

### StatusBadge Options

```typescript
// Size variants
<StatusBadge status="live" size="sm" />      // Small
<StatusBadge status="live" size="default" /> // Default
<StatusBadge status="live" size="lg" />      // Large

// With icons (when implemented)
<StatusBadge status="live" showIcon />

// With custom className
<StatusBadge status="live" className="ml-2" />

// With accessibility attributes
<StatusBadge 
  status="live" 
  aria-label="Product status: Live"
  title="Custom description"
/>
```

### Status Utilities

```typescript
// Get status information
const statusDef = getStatusDefinition('live');
console.log(statusDef.label);        // "Live"
console.log(statusDef.description);  // "Product is published and active"
console.log(statusDef.variant);      // "success"
console.log(statusDef.category);     // "lifecycle"

// Filter statuses by category
const lifecycleStatuses = getStatusesByCategory('lifecycle');
// Returns: ['draft', 'review', 'live', 'archived']

// Sort by priority
const sortedStatuses = sortStatusesByPriority(['archived', 'live', 'draft', 'review']);
// Returns: ['live', 'review', 'draft', 'archived']
```

---

## 🔘 ENHANCED BUTTON REFERENCE

### Button Patterns (Recommended)

```typescript
// Primary Actions - Main CTAs
<PrimaryActionButton>Save Product</PrimaryActionButton>
<PrimaryActionButton size="lg">Get Started</PrimaryActionButton>

// Secondary Actions - Supporting actions  
<SecondaryActionButton>Cancel</SecondaryActionButton>

// Success Actions - Positive actions (save, publish, approve)
<SuccessActionButton>Publish Now</SuccessActionButton>
<SuccessActionButton>Approve Changes</SuccessActionButton>

// Warning Actions - Caution required (archive, unpublish)
<WarningActionButton>Archive Product</WarningActionButton>

// Danger Actions - Destructive actions (delete, remove)
<DangerActionButton>Delete Product</DangerActionButton>
<DangerActionButton>Remove from Store</DangerActionButton>

// Call to Action - Hero sections, important conversions
<CallToActionButton>Start Free Trial</CallToActionButton>
<CallToActionButton size="xl">Join Now</CallToActionButton>
```

### Direct Variants (Advanced Usage)

```typescript
// Professional gradients
<EnhancedButton variant="gradient-primary">Save</EnhancedButton>
<EnhancedButton variant="gradient-secondary">Cancel</EnhancedButton>

// Action-specific variants
<EnhancedButton variant="action-primary">Primary</EnhancedButton>
<EnhancedButton variant="action-secondary">Secondary</EnhancedButton>
<EnhancedButton variant="action-success">Success</EnhancedButton>
<EnhancedButton variant="action-warning">Warning</EnhancedButton>
<EnhancedButton variant="action-danger">Danger</EnhancedButton>
<EnhancedButton variant="action-info">Info</EnhancedButton>

// Context-specific variants
<EnhancedButton variant="cta">Call to Action</EnhancedButton>
<EnhancedButton variant="subtle">Subtle</EnhancedButton>
<EnhancedButton variant="minimal">Minimal</EnhancedButton>

// Original shadcn/ui variants (still available)
<EnhancedButton variant="default">Default</EnhancedButton>
<EnhancedButton variant="destructive">Destructive</EnhancedButton>
<EnhancedButton variant="outline">Outline</EnhancedButton>
<EnhancedButton variant="secondary">Secondary</EnhancedButton>
<EnhancedButton variant="ghost">Ghost</EnhancedButton>
<EnhancedButton variant="link">Link</EnhancedButton>
```

### Button States & Options

```typescript
// Size variants
<EnhancedButton size="sm">Small</EnhancedButton>       // Height: 36px
<EnhancedButton size="default">Default</EnhancedButton> // Height: 40px  
<EnhancedButton size="lg">Large</EnhancedButton>       // Height: 44px
<EnhancedButton size="xl">Extra Large</EnhancedButton>  // Height: 48px
<EnhancedButton size="icon">Icon</EnhancedButton>      // 40x40px square

// Loading state
<EnhancedButton loading>Loading...</EnhancedButton>
<EnhancedButton loading variant="action-success">
  {loading ? 'Saving...' : 'Save Product'}
</EnhancedButton>

// Disabled state  
<EnhancedButton disabled>Disabled</EnhancedButton>

// Icon buttons
<EnhancedButton size="icon" variant="ghost" aria-label="Settings">
  <SettingsIcon className="h-4 w-4" />
</EnhancedButton>

// As child (Radix Slot pattern)
<EnhancedButton asChild>
  <Link to="/products">View Products</Link>
</EnhancedButton>
```

### Loading Button Pattern

```typescript
import { LoadingButton } from '@/components/ui/button-patterns';

// Automatic loading state management
<LoadingButton 
  isLoading={isSaving} 
  loadingText="Saving Product..."
  onClick={handleSave}
>
  Save Product
</LoadingButton>
```

---

## 🎨 DESIGN TOKENS REFERENCE

### CSS Custom Properties

#### **Status Colors**

```css
/* Status Success (Green) */
--status-success: hsl(142, 76%, 36%);
--status-success-bg: hsl(142, 76%, 36%, 0.1);
--status-success-border: hsl(142, 76%, 36%, 0.2);
--status-success-fg: hsl(142, 76%, 36%);

/* Status Warning (Yellow) */
--status-warning: hsl(38, 92%, 50%);
--status-warning-bg: hsl(38, 92%, 50%, 0.1);
--status-warning-border: hsl(38, 92%, 50%, 0.2);
--status-warning-fg: hsl(38, 92%, 50%);

/* Status Error (Red) */
--status-error: hsl(0, 84%, 60%);
--status-error-bg: hsl(0, 84%, 60%, 0.1);
--status-error-border: hsl(0, 84%, 60%, 0.2);
--status-error-fg: hsl(0, 84%, 60%);

/* Status Info (Blue) */
--status-info: hsl(217, 91%, 60%);
--status-info-bg: hsl(217, 91%, 60%, 0.1);
--status-info-border: hsl(217, 91%, 60%, 0.2);
--status-info-fg: hsl(217, 91%, 60%);

/* Status Processing (Purple) */
--status-processing: hsl(262, 83%, 58%);
--status-processing-bg: hsl(262, 83%, 58%, 0.1);
--status-processing-border: hsl(262, 83%, 58%, 0.2);
--status-processing-fg: hsl(262, 83%, 58%);
```

#### **Component Tokens**

```css
/* Button Gradients */
--button-primary-gradient: linear-gradient(135deg, var(--primary) 0%, hsl(252, 83%, 68%) 100%);
--button-secondary-gradient: linear-gradient(135deg, var(--secondary) 0%, hsl(210, 40%, 90%) 100%);

/* Category Colors */
--category-lifecycle: hsl(217, 91%, 60%);    /* Blue */
--category-inventory: hsl(142, 76%, 36%);    /* Green */
--category-syndication: hsl(262, 83%, 58%);  /* Purple */
--category-validation: hsl(0, 84%, 60%);     /* Red */

/* Component Spacing */
--badge-padding: 0.25rem 0.75rem;
--button-padding: 0.5rem 1rem;
```

### Using Tokens in CSS

```css
/* ✅ Correct - Use semantic tokens */
.custom-status-indicator {
  background-color: var(--status-success-bg);
  color: var(--status-success-fg);
  border: 1px solid var(--status-success-border);
}

.custom-error-message {
  background-color: var(--status-error-bg);
  color: var(--status-error-fg);
  padding: var(--badge-padding);
}

/* ❌ Incorrect - Don't use hardcoded colors */
.bad-status-indicator {
  background-color: rgba(34, 197, 94, 0.1); /* DON'T DO THIS */
  color: rgb(34, 197, 94); /* DON'T DO THIS */
}
```

### Using Tokens in Tailwind

```typescript
// ✅ Correct - Use semantic token classes
<div className="bg-status-success-bg text-status-success-fg border border-status-success-border">
  Success message
</div>

<div className="bg-status-error-bg text-status-error-fg p-4 rounded">
  Error message  
</div>

// ❌ Incorrect - Don't use hardcoded colors
<div className="bg-green-500/10 text-green-400"> {/* DON'T DO THIS */}
  Success message
</div>
```

---

## 🚨 COMMON PATTERNS & ANTI-PATTERNS

### ✅ DO: Recommended Patterns

```typescript
// ✅ Use StatusBadge for status indicators
<StatusBadge status="live" />
<StatusBadge status={product.status as StatusKey} />

// ✅ Use button patterns for consistent actions
<PrimaryActionButton onClick={handleSave}>
  Save Product
</PrimaryActionButton>

// ✅ Use semantic tokens for custom styling
<div className="bg-status-success-bg text-status-success-fg">
  Custom success styling
</div>

// ✅ Combine with loading states
<SuccessActionButton 
  loading={isPublishing}
  disabled={!isValid}
  onClick={handlePublish}
>
  {isPublishing ? 'Publishing...' : 'Publish Product'}
</SuccessActionButton>

// ✅ Use status utilities for logic
const statusDef = getStatusDefinition(product.status);
if (statusDef.variant === 'success') {
  // Handle success state
}
```

### ❌ DON'T: Anti-Patterns

```typescript
// ❌ Don't use hardcoded colors
<span className="bg-green-500/10 text-green-400">
  Status
</span>

// ❌ Don't bypass the component system
<button className="bg-gradient-to-r from-purple-600 to-blue-600">
  CTA Button
</button>

// ❌ Don't create custom status badges
const CustomStatusBadge = ({ status }) => {
  const colorMap = {
    live: 'bg-green-500',
    draft: 'bg-gray-500'  // DON'T DO THIS
  };
  return <span className={colorMap[status]}>{status}</span>;
};

// ❌ Don't ignore TypeScript types
<StatusBadge status="invalid-status" /> // Type error!

// ❌ Don't use inline styles with hardcoded colors
<div style={{ backgroundColor: '#10B981' }}> {/* DON'T DO THIS */}
  Success message
</div>
```

---

## 🛠️ DEVELOPMENT WORKFLOW

### Setup Development Environment

```bash
# 1. Ensure design system CSS is imported
# In your main CSS file (src/index.css):
@import './styles/design-tokens.css';

# 2. Verify TypeScript configuration
# Ensure paths are configured for @/ imports

# 3. Install development dependencies (if not already installed)
npm install class-variance-authority clsx tailwind-merge lucide-react
```

### Development Validation

```typescript
// The design system automatically validates in development
// Console warnings will appear for violations like:

// ❌ This will trigger a warning:
<div className="bg-red-500 text-white">Error</div>

// Console output:
// 🎨 Design System Violations Detected
// 🚨 1. bg-red-500
//    → Use StatusBadge variant="error" or CSS token --status-error
//    → Recommended: StatusBadge
//    → Severity: HIGH

// ✅ This is correct:
<StatusBadge status="validation-error">Error</StatusBadge>
```

### Testing Your Components

```typescript
// Test that your components use the design system correctly
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge-smart';

test('uses design system StatusBadge', () => {
  render(<StatusBadge status="live" />);
  
  const badge = screen.getByText('Live');
  expect(badge).toHaveClass('bg-status-success-bg');
  expect(badge).toHaveClass('text-status-success-fg');
});
```

### Code Review Checklist

Before submitting your PR, verify:

- [ ] **No hardcoded colors** - All status indicators use `StatusBadge`
- [ ] **Consistent buttons** - All actions use button patterns or `EnhancedButton`
- [ ] **Semantic tokens** - Custom styling uses CSS custom properties
- [ ] **TypeScript compliance** - No type errors, proper `StatusKey` usage
- [ ] **Accessibility** - Proper ARIA labels and descriptions
- [ ] **No console warnings** - Development environment shows no violations

---

## 🏗️ COMPONENT COMPOSITION EXAMPLES

### Product Card with Status

```typescript
function ProductCard({ product }: { product: Product }) {
  const statusKey = product.status as StatusKey;
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{product.name}</h3>
        <StatusBadge status={statusKey} />
      </div>
      
      <p className="text-muted-foreground mb-4">
        {product.description}
      </p>
      
      <div className="flex gap-2">
        <PrimaryActionButton size="sm">
          Edit
        </PrimaryActionButton>
        
        {statusKey === 'draft' && (
          <SuccessActionButton size="sm">
            Publish
          </SuccessActionButton>
        )}
        
        <DangerActionButton size="sm" variant="outline">
          Delete
        </DangerActionButton>
      </div>
    </div>
  );
}
```

### Bulk Actions with Loading States

```typescript
function BulkActions({ selectedIds, onBulkAction }: BulkActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  const handleAction = async (action: string) => {
    setLoadingAction(action);
    try {
      await onBulkAction(action, selectedIds);
    } finally {
      setLoadingAction(null);
    }
  };
  
  return (
    <div className="flex gap-2">
      <SuccessActionButton
        loading={loadingAction === 'publish'}
        onClick={() => handleAction('publish')}
        disabled={selectedIds.length === 0}
      >
        Publish Selected ({selectedIds.length})
      </SuccessActionButton>
      
      <WarningActionButton
        loading={loadingAction === 'archive'}
        onClick={() => handleAction('archive')}
        disabled={selectedIds.length === 0}
      >
        Archive Selected
      </WarningActionButton>
      
      <DangerActionButton
        loading={loadingAction === 'delete'}
        onClick={() => handleAction('delete')}
        disabled={selectedIds.length === 0}
        variant="outline"
      >
        Delete Selected
      </DangerActionButton>
    </div>
  );
}
```

### Status Filter Component

```typescript
function StatusFilter({ value, onChange }: StatusFilterProps) {
  const lifecycleStatuses = getStatusesByCategory('lifecycle');
  const inventoryStatuses = getStatusesByCategory('inventory');
  
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Product Status</h4>
        <div className="flex flex-wrap gap-2">
          {lifecycleStatuses.map(status => (
            <button
              key={status}
              onClick={() => onChange(status)}
              className={`inline-flex items-center ${
                value === status ? 'ring-2 ring-primary' : ''
              }`}
            >
              <StatusBadge status={status} />
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Inventory Status</h4>
        <div className="flex flex-wrap gap-2">
          {inventoryStatuses.map(status => (
            <button
              key={status}
              onClick={() => onChange(status)}
              className={`inline-flex items-center ${
                value === status ? 'ring-2 ring-primary' : ''
              }`}
            >
              <StatusBadge status={status} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Form with Validation States

```typescript
function ProductForm({ product, onSave }: ProductFormProps) {
  const [validation, setValidation] = useState<{
    name: StatusKey;
    description: StatusKey;
    price: StatusKey;
  }>({
    name: 'valid',
    description: 'valid', 
    price: 'valid'
  });
  
  return (
    <form className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Product Name
          <StatusBadge status={validation.name} className="ml-2" />
        </label>
        <input
          type="text"
          className={`w-full px-3 py-2 border rounded-md ${
            validation.name === 'validation-error' 
              ? 'border-status-error' 
              : validation.name === 'validation-warning'
              ? 'border-status-warning'
              : 'border-input'
          }`}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Description
          <StatusBadge status={validation.description} className="ml-2" />
        </label>
        <textarea
          className={`w-full px-3 py-2 border rounded-md ${
            validation.description === 'validation-error'
              ? 'border-status-error'
              : 'border-input'
          }`}
        />
      </div>
      
      <div className="flex gap-3">
        <SuccessActionButton 
          type="submit"
          disabled={Object.values(validation).some(v => v === 'validation-error')}
        >
          Save Product
        </SuccessActionButton>
        
        <SecondaryActionButton type="button">
          Cancel
        </SecondaryActionButton>
      </div>
    </form>
  );
}
```

---

## 🎯 QUICK TROUBLESHOOTING

### Common Issues & Solutions

#### **Issue: Component not found**
```typescript
// ❌ Error: Cannot find module '@/components/ui/status-badge-smart'
import { StatusBadge } from '@/components/ui/status-badge-smart';

// ✅ Solution: Check import paths and ensure files exist
// Verify: src/components/ui/status-badge-smart.tsx exists
// Check: tsconfig.json has proper path mapping for "@/*"
```

#### **Issue: Status type errors**
```typescript
// ❌ Type error: Argument of type 'string' is not assignable to parameter of type 'StatusKey'
<StatusBadge status={product.status} />

// ✅ Solution: Use type assertion or validation
<StatusBadge status={product.status as StatusKey} />

// ✅ Better: Validate the status
const isValidStatus = (status: string): status is StatusKey => 
  status in STATUS_DEFINITIONS;

const statusKey = isValidStatus(product.status) ? product.status : 'draft';
<StatusBadge status={statusKey} />
```

#### **Issue: Design tokens not working**
```css
/* ❌ CSS custom properties not working */
.my-component {
  background-color: var(--status-success-bg); /* Not working */
}

/* ✅ Solution: Ensure design-tokens.css is imported */
/* In src/index.css or main CSS file: */
@import './styles/design-tokens.css';
```

#### **Issue: Console warnings about violations**
```typescript
// ❌ Console: Design System Violations Detected
<div className="bg-red-500 text-white">Error</div>

// ✅ Solution: Use design system components
<StatusBadge status="validation-error">Error</StatusBadge>

// ✅ Or use semantic tokens
<div className="bg-status-error-bg text-status-error-fg">Error</div>
```

#### **Issue: Button not styling correctly**
```typescript
// ❌ Button not showing gradient
<EnhancedButton variant="gradient-primary">Save</EnhancedButton>

// ✅ Check: Design tokens imported
// ✅ Check: CSS custom properties available
// ✅ Alternative: Use button pattern
<PrimaryActionButton>Save</PrimaryActionButton>
```

### Performance Issues

#### **Bundle size too large**
```bash
# Check bundle composition
npm run build -- --analyze

# Solution: Ensure tree-shaking is working
# Only import what you need:
import { StatusBadge } from '@/components/ui/status-badge-smart';
// Not: import * from '@/components/ui';
```

#### **Slow component rendering**
```typescript
// Solution: Use React.memo for expensive components
const MemoizedProductCard = React.memo(ProductCard);

// Solution: Optimize status lookups
const statusDef = useMemo(
  () => getStatusDefinition(status),
  [status]
);
```

### Development Environment Issues

#### **Hot reload not working with design tokens**
```bash
# Solution: Restart development server after CSS changes
npm run dev

# Or: Configure Vite to watch CSS files
# In vite.config.ts:
export default defineConfig({
  css: {
    devSourcemap: true
  }
});
```

#### **TypeScript errors after update**
```bash
# Solution: Clear TypeScript cache and restart
rm -rf node_modules/.cache
npm run type-check
```

---

## 📝 CHEAT SHEET

### Status Quick Reference

| Status | Variant | Color | Use Case |
|--------|---------|--------|----------|
| `live` | `success` | Green | Published products |
| `draft` | `secondary` | Gray | Work in progress |
| `review` | `warning` | Yellow | Awaiting approval |
| `in-stock` | `success` | Green | Available inventory |
| `low-stock` | `warning` | Yellow | Limited quantity |
| `out-of-stock` | `error` | Red | No inventory |
| `processing` | `info` | Blue | Active processing |
| `completed` | `success` | Green | Task finished |
| `failed` | `error` | Red | Process failed |
| `synced` | `success` | Green | Platform sync OK |
| `sync-error` | `error` | Red | Sync failed |

### Button Quick Reference

| Pattern | Variant | Use Case |
|---------|---------|----------|
| `PrimaryActionButton` | `gradient-primary` | Main CTAs, save actions |
| `SecondaryActionButton` | `action-secondary` | Cancel, secondary actions |
| `SuccessActionButton` | `action-success` | Publish, approve, confirm |
| `WarningActionButton` | `action-warning` | Archive, unpublish |
| `DangerActionButton` | `action-danger` | Delete, remove, destroy |
| `CallToActionButton` | `cta` | Hero buttons, conversions |

### Token Quick Reference

| Token | Usage | Example |
|-------|-------|---------|
| `--status-success-bg` | Success backgrounds | Status badges, alerts |
| `--status-warning-fg` | Warning text | Error messages |
| `--button-primary-gradient` | Button gradients | Primary action buttons |
| `--category-lifecycle` | Category colors | Lifecycle indicators |

---

## 📞 SUPPORT & RESOURCES

### Getting Help

1. **Documentation Issues**: Check the Technical Specifications document
2. **Implementation Questions**: Review the Implementation Guide  
3. **Type Errors**: Ensure proper imports and StatusKey usage
4. **Styling Issues**: Verify design tokens are imported
5. **Performance Concerns**: Check bundle analysis and tree-shaking

### Additional Resources

- **Storybook**: View all components and variants visually
- **TypeScript**: IntelliSense provides component prop suggestions  
- **Browser DevTools**: Inspect CSS custom properties
- **Bundle Analyzer**: Understand impact on bundle size

### Best Practices Reminder

1. **Always use `StatusBadge`** for status indicators
2. **Prefer button patterns** over direct variants  
3. **Use semantic tokens** for custom styling
4. **Follow TypeScript types** strictly
5. **Test with validation tools** during development
6. **Maintain accessibility** with proper ARIA attributes

---

**This handbook provides everything you need for daily development with the QueenOne Design System. Keep it bookmarked for instant reference!**

---

*Updated for Design System v1.0 - Production Ready*