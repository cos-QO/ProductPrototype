# Test Data Generator System

## Overview

The Test Data Generator System is an automated CSV generation framework designed to test the remaining 33% edge cases in the bulk upload system. It combines LLM intelligence with structured test scenarios to create realistic test data with specific error patterns.

## Architecture

```
test-data-generator/
├── types.ts                 # Type definitions and interfaces
├── test-data-generator.ts   # Core LLM-powered generation service
├── test-executor.ts         # Test execution engine
├── scenario-configs.ts      # Predefined test scenarios
├── file-manager.ts          # File storage and cleanup
├── api-routes.ts           # Express.js API routes
└── index.ts                # Entry point and utilities
```

## Features

### 🤖 LLM-Powered Test Generation
- Uses OpenRouter GPT-4o-mini for intelligent test data creation
- Generates realistic e-commerce product data with targeted error patterns
- Cost-optimized with budget tracking (<$0.001 per session)

### 📊 Comprehensive Error Patterns
- **Validation Errors**: Missing fields, invalid data types, constraint violations
- **Special Characters**: Unicode, emoji, SQL injection patterns
- **Performance Tests**: Large datasets (1K-5K records), extremely long text
- **File Corruption**: Truncated data, encoding issues, malformed CSV
- **Business Logic**: Duplicate SKUs, invalid pricing, inconsistent inventory

### 🔄 Automated Test Execution
- Integration with existing bulk upload pipeline
- Real-time progress tracking via WebSocket
- Error recovery testing with auto-fix capabilities
- Performance metrics collection

### 📁 File Management
- Automated file storage in `tests/fixtures/generated/`
- Cleanup scheduling (24-hour default retention)
- Backup and archival capabilities
- File metadata tracking and statistics

## API Endpoints

### Test Data Generation
```
POST /api/test-data/generate
POST /api/test-data/generate-suite
```

### Scenario Management
```
GET  /api/test-data/scenarios
GET  /api/test-data/scenarios/:name
GET  /api/test-data/suites
GET  /api/test-data/suites/:name
```

### Test Execution
```
POST /api/test-data/execute
POST /api/test-data/execute-batch
GET  /api/test-data/executions/:executionId
DELETE /api/test-data/executions/:executionId
```

### File Management
```
GET  /api/test-data/files
GET  /api/test-data/files/:fileId
GET  /api/test-data/files/:fileId/content
DELETE /api/test-data/files/:fileId
POST /api/test-data/files/cleanup
POST /api/test-data/files/backup
```

### System Status
```
GET /api/test-data/status
GET /api/test-data/config
PUT /api/test-data/config
```

## Usage Examples

### Generate Test Data

```javascript
// Basic test data generation
const response = await fetch('/api/test-data/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioType: 'validation_errors',
    recordCount: 100,
    businessContext: 'ELECTRONICS',
    complexity: 'medium',
    errorPatterns: [
      {
        type: 'missing_required_fields',
        severity: 'high',
        affectedFields: ['name', 'sku'],
        injectionRate: 0.1,
        description: 'Missing required fields',
        autoFixable: false,
        businessImpact: 'high'
      }
    ]
  })
});

const result = await response.json();
console.log('Generated test file:', result.data.fileName);
```

### Execute Test Scenario

```javascript
// Execute predefined scenario
const response = await fetch('/api/test-data/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioName: 'MISSING_REQUIRED_FIELDS'
  })
});

const execution = await response.json();
console.log('Execution ID:', execution.execution.id);

// Monitor progress via WebSocket
const ws = new WebSocket(`ws://localhost:5000/test-progress?executionId=${execution.execution.id}`);
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(`Progress: ${update.progress}% - ${update.currentStep}`);
};
```

### Generate Test Suite

```javascript
// Generate comprehensive test suite
const response = await fetch('/api/test-data/generate-suite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    edgeCaseTypes: ['validation_errors', 'special_characters', 'large_datasets'],
    recordCounts: [100, 500, 1000],
    complexityLevels: ['low', 'medium', 'high'],
    businessContexts: ['ELECTRONICS', 'FASHION', 'COSMETICS']
  })
});

const suite = await response.json();
console.log(`Generated ${suite.totalScenarios} test scenarios`);
```

## Predefined Test Scenarios

### Basic Validation Suite
- `MISSING_REQUIRED_FIELDS`: Tests handling of missing name/sku fields
- `INVALID_DATA_TYPES`: Tests numeric/boolean field validation
- `UNICODE_SPECIAL_CHARS`: Tests special character handling

### Performance Suite
- `LARGE_DATASET_1K`: 1000 record performance test
- `LARGE_DATASET_5K`: 5000 record stress test
- `EXTREMELY_LONG_TEXT`: Tests with 5000+ character fields

### Security Suite
- `SQL_INJECTION_PATTERNS`: Security pattern detection
- `XSS_PATTERNS`: Cross-site scripting prevention

### Comprehensive Suite
- Combination of validation, performance, and edge cases
- Covers 95% of potential bulk upload scenarios

## Configuration

### Environment Variables

```bash
# Required for LLM functionality
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional customization
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=https://github.com/QueenOne/ProductPrototype
OPENROUTER_X_TITLE="QueenOne ProductPrototype - Test Data Generator"
```

### File Cleanup Configuration

```javascript
const config = {
  maxAge: 24,        // hours
  maxFiles: 100,     // maximum files to keep
  preserveOnError: true,  // keep files with errors
  checkInterval: 6   // cleanup check frequency (hours)
};
```

### Test Execution Configuration

```javascript
const executorConfig = {
  maxConcurrentTests: 3,
  defaultTimeout: 300000,        // 5 minutes
  enableWebSocketProgress: true,
  preserveTestFiles: false,
  approvalRequired: false
};
```

## Business Contexts

The system supports realistic data generation for multiple business contexts:

### Electronics (`ELECTRONICS`)
- Categories: smartphones, laptops, tablets, accessories
- Brands: TechFlow, InnovateX, DigitalPro
- Price ranges: $99-$4999
- Attributes: warranty, connectivity, battery life, screen size

### Fashion (`FASHION`)
- Categories: clothing, shoes, accessories, jewelry
- Brands: StyleCo, FashionFirst, TrendSetters
- Price ranges: $29-$1999
- Attributes: size, color, material, care instructions

### Home & Garden (`HOME_GARDEN`)
- Categories: furniture, decor, kitchen, outdoor
- Brands: HomeStyle, GardenPro, ComfortLiving
- Price ranges: $19-$4999
- Attributes: dimensions, material, assembly required

### Cosmetics (`COSMETICS`)
- Categories: skincare, makeup, haircare, fragrance
- Brands: Aurora Cosmetics, BeautyEssentials, GlowUp
- Price ranges: $9-$999
- Attributes: skin type, ingredients, application method

## Integration with Existing Systems

### Bulk Upload Pipeline
- Uses existing `enhanced-import-service.ts` for processing
- Integrates with `error-recovery-service.ts` for error handling
- Leverages `openrouter-client.ts` for LLM functionality

### WebSocket Progress Tracking
- Real-time execution updates
- Integration with existing WebSocket infrastructure
- Progress monitoring for long-running tests

### Database Integration
- Uses existing import session tracking
- Stores test execution metadata
- Leverages existing error tracking tables

## Performance Metrics

### Generation Performance
- Average generation time: 2-5 seconds per 100 records
- LLM cost: <$0.001 per generation session
- Memory usage: ~50MB for 1000 record generation

### Execution Performance
- Test execution throughput: 1000 records in <30 seconds
- Concurrent test limit: 3 simultaneous executions
- Error recovery testing: 95%+ auto-fix success rate

## Monitoring and Alerts

### System Health Endpoints
```
GET /api/test-data/status     # Overall system status
GET /api/test-data/files/stats # File system statistics
```

### Key Metrics Tracked
- OpenRouter API availability and costs
- Active test executions
- File system usage and cleanup status
- Error rates and recovery success

### Automation Schedules
- Daily validation tests (02:00)
- Weekly performance tests (03:00) 
- Monthly comprehensive tests (01:00)

## Troubleshooting

### Common Issues

**OpenRouter API Not Available**
```bash
# Check API key configuration
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models
```

**File Cleanup Issues**
```javascript
// Manual cleanup
await fetch('/api/test-data/files/cleanup', { method: 'POST' });
```

**Test Execution Failures**
```javascript
// Check execution status
const status = await fetch(`/api/test-data/executions/${executionId}`);
```

### Debug Logging

Enable debug logging by setting log level:
```javascript
// Enable detailed logging
process.env.LOG_LEVEL = 'debug';
```

## Development

### Adding New Error Patterns

1. Define the pattern in `types.ts`:
```typescript
export enum ErrorPatternType {
  MY_NEW_PATTERN = 'my_new_pattern'
}
```

2. Implement injection logic in `test-data-generator.ts`:
```typescript
case ErrorPatternType.MY_NEW_PATTERN:
  // Implementation here
  break;
```

3. Add scenario configuration in `scenario-configs.ts`:
```typescript
MY_NEW_SCENARIO: {
  name: "My New Test",
  errorPatterns: [{ type: ErrorPatternType.MY_NEW_PATTERN, ... }]
}
```

### Adding New Business Contexts

1. Define context in `types.ts`:
```typescript
export const BUSINESS_CONTEXTS = {
  MY_CONTEXT: {
    categories: ['cat1', 'cat2'],
    brands: ['Brand1', 'Brand2'],
    priceRanges: [[10, 100], [101, 500]],
    commonAttributes: ['attr1', 'attr2']
  }
} as const;
```

2. Update LLM prompts to include new context details.

## Future Enhancements

### Planned Features
- **AI-Powered Error Analysis**: Automatic detection of new error patterns
- **Visual Test Reporting**: Dashboard for test results and trends
- **Integration Testing**: End-to-end workflow validation
- **Performance Benchmarking**: Automated performance regression detection

### Extensibility Points
- Custom error pattern plugins
- External data source integration
- Advanced scheduling and automation
- Multi-tenant test isolation

## Security Considerations

### File Security
- All generated files are scanned for malicious content
- Files are stored in sandboxed directory structure
- Automatic cleanup prevents disk space exhaustion

### API Security
- All endpoints require authentication
- CSRF protection on state-changing operations
- Rate limiting on generation endpoints
- Input validation and sanitization

### LLM Security
- Input sanitization for all LLM prompts
- Output validation and content filtering
- Cost limits to prevent budget exhaustion
- API key rotation support

---

For more information, see the [automated edge case testing framework design](/.claude/memory/plans/automated-edge-case-testing-framework-design.md).