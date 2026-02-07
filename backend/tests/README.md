# 🧪 ÖNDER DENETİM BACKEND - TEST SUITE

## Test Structure

```
tests/
├── unit/                   # Unit tests for individual functions
│   ├── utils/
│   ├── controllers/
│   └── services/
├── integration/            # Integration tests for API endpoints
│   ├── auth.test.js
│   ├── blog.test.js
│   ├── contact.test.js
│   └── calculators.test.js
└── e2e/                    # End-to-end tests
    └── user-flows.test.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/integration/auth.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Configuration

See `jest.config.js` in project root.

## Writing Tests

Each test file should:
1. Import necessary dependencies
2. Set up test database/mocks
3. Test happy paths
4. Test error scenarios
5. Clean up after tests
