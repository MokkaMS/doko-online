import { validatePlayerName, isValidOrigin } from './src/utils/validation';

// Unit tests for validation logic
const logicTests = [
  { name: 'Valid name', input: 'Alice', expected: null },
  { name: 'Valid name with spaces', input: 'Alice Smith', expected: null },
  { name: 'Empty name', input: '', expected: 'Player name is required' },
  { name: 'Too short after trim', input: '   ', expected: 'Player name is too short' },
  { name: 'Too long', input: 'a'.repeat(21), expected: 'Player name is too long (max 20 characters)' },
  { name: 'Invalid characters', input: 'Alice!', expected: 'Player name contains invalid characters (only alphanumeric and spaces allowed)' },
];

console.log('Running validation logic tests...');
let failed = false;
logicTests.forEach(t => {
  const result = validatePlayerName(t.input);
  if (result !== t.expected) {
    console.error(`FAIL: ${t.name}. Expected "${t.expected}", got "${result}"`);
    failed = true;
  } else {
    console.log(`PASS: ${t.name}`);
  }
});

if (failed) {
  process.exit(1);
}
console.log('Validation logic tests passed!\n');

const originTests = [
  { name: 'Valid localhost', input: 'http://localhost:5173', expected: true },
  { name: 'Valid domain', input: 'https://example.com', expected: true },
  { name: 'Wildcard', input: '*', expected: true },
  { name: 'No protocol', input: 'example.com', expected: false },
  { name: 'Invalid protocol', input: 'ftp://example.com', expected: false },
  { name: 'Malformed', input: 'not-a-url', expected: false },
  { name: 'Empty', input: '', expected: false },
];

console.log('Running isValidOrigin tests...');
failed = false;
originTests.forEach(t => {
  const result = isValidOrigin(t.input);
  if (result !== t.expected) {
    console.error(`FAIL: ${t.name}. Expected ${t.expected}, got ${result}`);
    failed = true;
  } else {
    console.log(`PASS: ${t.name}`);
  }
});

if (failed) {
  process.exit(1);
}
console.log('isValidOrigin tests passed!\n');

// If we can run a full integration test, we would do it here.
// But given the environment constraints, we will rely on the unit test of the logic
// which is the core of the fix.
