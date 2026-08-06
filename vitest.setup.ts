// Vitest runs in Node, so the isomorphic env resolution falls back to the server implementations.
// Pin the API origin and hospital code to stable values for the generated client.
process.env.VITE_API_ORIGIN = 'http://api.test';
process.env.VITE_HOSPITAL_CODE = 'test-hospital';
