# Error Recovery Test Suite

## Overview

This comprehensive test suite validates the error recovery functionality for the CSV bulk upload system. It covers the remaining 33% edge cases and provides complete automated testing of error recovery workflows.

## Test Suite Components

### 1. Test Files Structure

```
tests/
├── integration/
│   ├── error-recovery-integration.test.js        # Core integration tests
│   ├── error-recovery-api.test.js               # Basic API tests
│   ├── error-recovery-api-enhanced.test.js      # Enhanced API tests with WebSocket
│   ├── error-recovery-e2e.test.js               # Basic E2E tests
│   ├── error-recovery-e2e-enhanced.test.js      # Enhanced E2E with test data generator
│   └── error-recovery-test-reporter.test.js     # Test reporting and metrics
├── performance/
│   ├── error-recovery-performance.test.js       # Basic performance tests
│   └── error-recovery-performance-enhanced.test.js # Large-scale performance tests
├── unit/
│   └── error-recovery-dialog.test.js           # Unit tests for UI components
└── utils/
    ├── error-recovery-test-sequencer.cjs       # Test execution optimization
    └── error-recovery-results-processor.cjs    # Enhanced test reporting
```

### 2. Test Categories

#### Unit Tests
- **Focus**: Component-level testing
- **Coverage**: Error dialogs, UI components, utility functions
- **Duration**: ~5 seconds each
- **Coverage Target**: 90%+

#### Integration Tests
- **Focus**: Component interaction and error flow testing
- **Coverage**: API integration, WebSocket communication, database operations
- **Duration**: ~15-30 seconds each
- **Coverage Target**: 85%+

#### API Tests
- **Focus**: REST API endpoint testing with error scenarios
- **Coverage**: Authentication, error recovery endpoints, real-time updates
- **Duration**: ~20-25 seconds each
- **Special Features**: WebSocket testing, concurrent request handling

#### End-to-End Tests
- **Focus**: Complete user workflows with error recovery
- **Coverage**: Full upload → error → recovery → import cycle
- **Duration**: ~45-60 seconds each
- **Special Features**: Test data generator integration, fallback mechanisms

#### Performance Tests
- **Focus**: Large-scale error recovery testing
- **Coverage**: Concurrent sessions, massive datasets, memory usage
- **Duration**: ~90-120 seconds each
- **Thresholds**: 10,000 records, 20+ concurrent sessions

#### Test Reporter
- **Focus**: Comprehensive metrics collection and analysis
- **Coverage**: Test result processing, recommendation generation
- **Duration**: ~10-15 seconds
- **Output**: JSON reports, HTML dashboards, markdown summaries

## Quick Start

### Prerequisites
```bash
# Ensure database is running
npm run docker:up

# Install dependencies (if needed)
npm install
```

### Basic Usage

```bash
# Run all error recovery tests
npm run test:error-recovery

# Run with coverage reporting
npm run test:error-recovery:coverage

# Run specific test categories
npm run test:error-recovery:unit
npm run test:error-recovery:integration
npm run test:error-recovery:performance

# Run in watch mode for development
npm run test:error-recovery:watch

# Run quick validation tests
npm run test:error-recovery:quick
```

### Advanced Usage

```bash
# Full test suite with verbose output
npm run test:error-recovery:full

# API tests only
npm run test:error-recovery:api

# E2E tests only
npm run test:error-recovery:e2e

# Performance tests only (sequential execution)
npm run test:error-recovery:performance
```

## Test Configuration

### Jest Configuration
- **Config File**: `jest.config.error-recovery.cjs`
- **Environment**: Node.js test environment
- **Coverage Directory**: `coverage/error-recovery/`
- **Test Timeout**: 45 seconds (adjustable per test type)

### Environment Variables
```bash
# Database connection
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/queenone_test

# OpenRouter API (for test data generation)
OPENROUTER_API_KEY=your-api-key

# Feature flags
ERROR_RECOVERY_ENABLED=true
TEST_DATA_GENERATOR_ENABLED=true
WEBSOCKET_ENABLED=true
PERFORMANCE_MONITORING=true
```

### Coverage Thresholds
- **Global**: 85% (lines, branches, functions, statements)
- **Error Recovery Service**: 95%+
- **Import Services**: 90%+
- **Unit Tests**: 90%+

## Test Execution Flow

### Optimized Test Sequencing
1. **Unit Tests** → Fast fundamental validation
2. **Integration Tests** → Component interaction validation
3. **API Tests** → External interface validation
4. **E2E Tests** → Comprehensive workflow validation
5. **Performance Tests** → Scale and performance validation
6. **Test Reporter** → Results analysis and reporting

### Parallel Execution
- **Unit & Integration**: Parallel execution (up to 50% of CPU cores)
- **Performance & E2E**: Sequential execution (maxWorkers=1)
- **API Tests**: Limited parallelism (maxWorkers=2)

## Test Data Management

### Test Data Generator Integration
- **LLM-Powered**: OpenRouter API integration for realistic test data
- **Fallback System**: Local test data when API unavailable
- **Scenarios**: 50+ error scenarios with realistic data patterns
- **Cleanup**: Automated test data cleanup after each run

### Fixtures
```
tests/fixtures/
├── test-bulk-upload-simulation.csv
├── test-complex-fields.csv
├── test-comprehensive-bulk-upload.csv
├── test-edge-case-inconsistent-columns.csv
└── test-edge-case-quoted-commas.csv
```

## Reporting and Analysis

### Generated Reports
1. **JSON Results**: `coverage/error-recovery/error-recovery-results.json`
2. **Coverage HTML**: `coverage/error-recovery/lcov-report/index.html`
3. **Summary Markdown**: `coverage/error-recovery/error-recovery-summary.md`
4. **Execution Logs**: `coverage/error-recovery/test-execution-{timestamp}.log`

### Metrics Tracked
- Error recovery pass rate
- Performance benchmarks (throughput, latency, memory)
- Test coverage by component
- Test execution time by category
- Failure patterns and recommendations

### Quality Gates
- **Hard Gates**: All tests pass, 85%+ coverage, performance thresholds met
- **Soft Gates**: No console errors, accessibility compliance, code quality metrics

## Error Recovery Scenarios Tested

### Validation Errors
- Missing required fields
- Invalid data types
- Format violations
- Business rule violations
- Cross-field validation failures

### Processing Errors
- Large file handling
- Memory constraints
- Timeout scenarios
- Concurrent processing conflicts
- Database transaction failures

### Communication Errors
- Network connectivity issues
- WebSocket disconnections
- API rate limiting
- Authentication failures
- Session timeouts

### Data Integrity Errors
- Partial import failures
- Rollback scenarios
- Duplicate detection
- Data corruption handling
- Consistency validation

## Development Guidelines

### Adding New Tests
1. Follow the naming convention: `error-recovery-{category}-{type}.test.js`
2. Use appropriate test category directory (`unit/`, `integration/`, `performance/`)
3. Include test metadata for the sequencer
4. Add coverage expectations
5. Update this documentation

### Test Writing Best Practices
- **Isolation**: Each test should be independent
- **Cleanup**: Always clean up test data
- **Deterministic**: Tests should produce consistent results
- **Performance**: Include timing assertions for critical paths
- **Error Scenarios**: Test both success and failure paths

### Debugging Tests
```bash
# Run with verbose output
npm run test:error-recovery -- --verbose

# Run specific test file
npm run test:error-recovery -- tests/integration/error-recovery-api-enhanced.test.js

# Debug mode with full logs
DEBUG=* npm run test:error-recovery

# Run with coverage for specific file
npm run test:error-recovery:coverage -- --testPathPatterns=api-enhanced
```

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Reset database
npm run docker:reset
npm run db:migrate
```

#### Test Timeouts
- Check `testTimeout` in Jest config
- Verify database performance
- Check for resource leaks

#### WebSocket Tests Failing
- Ensure WebSocket server is running
- Check port availability
- Verify authentication setup

#### Coverage Too Low
- Review uncovered lines in HTML report
- Add missing test scenarios
- Check test isolation issues

### Performance Issues
- Use `--maxWorkers=1` for debugging
- Check memory usage patterns
- Review database query performance
- Monitor test execution times

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Error Recovery Tests
  run: |
    npm run docker:up
    npm run db:migrate
    npm run test:error-recovery:full
    
- name: Upload Coverage Reports
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/error-recovery/lcov.info
```

### Quality Gates
- All error recovery tests must pass
- Coverage must meet thresholds
- Performance benchmarks must be met
- No critical security issues detected

## Maintenance

### Regular Tasks
1. **Weekly**: Review test execution times and optimize slow tests
2. **Monthly**: Update test data scenarios and edge cases
3. **Quarterly**: Review coverage targets and adjust thresholds
4. **Release**: Validate all error recovery scenarios with production data patterns

### Updates and Versioning
- Test suite version tracks with application version
- Breaking changes require test suite updates
- Performance benchmarks adjusted based on infrastructure changes
- Documentation updated with each major test addition

---

## Quick Reference

### Essential Commands
```bash
# Quick validation
npm run test:error-recovery:quick

# Full test suite
npm run test:error-recovery:full

# Coverage report
npm run test:error-recovery:coverage

# Performance only
npm run test:error-recovery:performance

# Watch mode
npm run test:error-recovery:watch
```

### Key Files
- **Config**: `jest.config.error-recovery.cjs`
- **Execution Script**: `scripts/run-error-recovery-tests.sh`
- **Test Utils**: `tests/utils/error-recovery-*`
- **Reports**: `coverage/error-recovery/`

### Support
For issues with the error recovery test suite:
1. Check the troubleshooting section above
2. Review the execution logs in `coverage/error-recovery/`
3. Consult the generated recommendations in test reports
4. Check the project's memory documentation in `/.claude/memory/`