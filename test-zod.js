// Test file to demonstrate Zod validation
const { registerSchema, loginSchema } = require('./src/schemas/user');

console.log('🧪 Testing Zod Validation\n');

// Test 1: Valid registration data
console.log('✅ Test 1: Valid registration data');
const validRegisterData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!',
  phone: '+1234567890',
  role: 'user'
};

const result1 = registerSchema.safeParse(validRegisterData);
console.log('Result:', result1.success ? '✅ Valid' : '❌ Invalid');
if (!result1.success) {
  console.log('Errors:', result1.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
}
console.log('Parsed data:', result1.data);
console.log('');

// Test 2: Invalid registration data (password mismatch)
console.log('❌ Test 2: Invalid registration data (password mismatch)');
const invalidRegisterData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password123!',
  confirmPassword: 'DifferentPassword123!',
  phone: '+1234567890'
};

const result2 = registerSchema.safeParse(invalidRegisterData);
console.log('Result:', result2.success ? '✅ Valid' : '❌ Invalid');
if (!result2.success) {
  console.log('Errors:', result2.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
}
console.log('');

// Test 3: Invalid email format
console.log('❌ Test 3: Invalid email format');
const invalidEmailData = {
  name: 'John Doe',
  email: 'invalid-email',
  password: 'Password123!',
  confirmPassword: 'Password123!'
};

const result3 = registerSchema.safeParse(invalidEmailData);
console.log('Result:', result3.success ? '✅ Valid' : '❌ Invalid');
if (!result3.success) {
  console.log('Errors:', result3.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
}
console.log('');

// Test 4: Valid login data
console.log('✅ Test 4: Valid login data');
const validLoginData = {
  email: 'john@example.com',
  password: 'Password123!'
};

const result4 = loginSchema.safeParse(validLoginData);
console.log('Result:', result4.success ? '✅ Valid' : '❌ Invalid');
if (!result4.success) {
  console.log('Errors:', result4.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
}
console.log('Parsed data:', result4.data);
console.log('');

// Test 5: Invalid password strength
console.log('❌ Test 5: Invalid password strength');
const weakPasswordData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'weak',
  confirmPassword: 'weak'
};

const result5 = registerSchema.safeParse(weakPasswordData);
console.log('Result:', result5.success ? '✅ Valid' : '❌ Invalid');
if (!result5.success) {
  console.log('Errors:', result5.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
}
console.log('');

console.log('🎉 Zod validation testing complete!');
