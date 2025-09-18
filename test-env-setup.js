// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres123@localhost:5432/queenone_test';
process.env.OPENROUTER_API_KEY = 'test_key_mock_for_testing';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only';
process.env.SESSION_SECRET = 'test_session_secret_for_testing_only';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing