# 2FA Security Questions - Manual Testing Guide

## Quick Summary: How Security Questions Work

### Setup Flow
1. User calls `/2fa/security-questions/setup` with 3-5 questions and answers
2. System hashes answers with bcrypt (lowercase + trimmed)
3. Questions saved to `user_security_question` table
4. System enables `security_question_enabled` flag
5. 10 backup codes generated and returned

### Verification Flow (During Login)
1. User logs in with email/password
2. If 2FA is enabled, login returns a temporary token
3. User gets security questions (without answers)
4. User submits answers via `/auth/verify-2fa`
5. System compares answers (case-insensitive, trimmed)
6. All answers must be correct
7. Attempt is logged with success/failure

### Key Features
- ✅ **Case-insensitive**: "fluffy", "Fluffy", "FLUFFY" all work
- ✅ **Whitespace trimming**: "  fluffy  " becomes "fluffy"
- ✅ **Secure hashing**: Answers hashed with bcrypt (never stored plain)
- ✅ **Rate limiting**: Max 5 failed attempts per 30 minutes
- ✅ **Attempt logging**: All attempts logged with IP address
- ✅ **Backup codes**: 10 one-time use backup codes

---

## Prerequisites

### 1. Start the Server
```bash
# Make sure you're in the project directory
cd /Users/waleedamjad/Downloads/psfss/psfss-backend

# Install dependencies (if not already done)
npm install

# Start server in development mode
npm run dev

# Or start in production mode
npm start
```

The server should be running on `http://localhost:3000`

### 2. Prepare Test User

You need a user account with `business_admin` role. You can:
- Use an existing account, OR
- Create a new one via the registration endpoint

**Test Credentials Example:**
```
Email: test@example.com
Password: password123
Role: business_admin
```

---

## Manual Test Steps

### Test 1: Check Initial 2FA Status

**Request:**
```bash
curl -X GET http://localhost:3000/api/2fa/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "is2FAEnabled": false,
    "methods": {
      "securityQuestion": {
        "enabled": false,
        "count": 0
      }
    },
    "backupCodesRemaining": 0
  }
}
```

---

### Test 2: Setup Security Questions

**Request:**
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "question": "What was your first pet'\''s name?",
        "answer": "Fluffy"
      },
      {
        "question": "In what city were you born?",
        "answer": "New York"
      },
      {
        "question": "What is your mother'\''s maiden name?",
        "answer": "Smith"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Security questions enabled successfully",
  "data": {
    "backupCodes": [
      "A3F2B8C1",
      "D9E4F1A2",
      "7C5B9E3D",
      ...
    ],
    "backupCodesMessage": "Save these backup codes in a safe place..."
  }
}
```

**✅ What to Check:**
- Status is "success"
- You receive 10 backup codes (8-char hex strings)
- Save these backup codes!

---

### Test 3: Verify 2FA Status After Setup

**Request:**
```bash
curl -X GET http://localhost:3000/api/2fa/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "is2FAEnabled": true,
    "methods": {
      "securityQuestion": {
        "enabled": true,
        "count": 3
      }
    },
    "backupCodesRemaining": 10
  }
}
```

**✅ What to Check:**
- `is2FAEnabled` is now `true`
- `securityQuestion.enabled` is `true`
- `securityQuestion.count` is `3` (number of questions)
- `backupCodesRemaining` is `10`

---

### Test 4: Get Security Questions

**Request:**
```bash
curl -X GET http://localhost:3000/api/2fa/security-questions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "questions": [
      {
        "id": 1,
        "question": "What was your first pet's name?"
      },
      {
        "id": 2,
        "question": "In what city were you born?"
      },
      {
        "id": 3,
        "question": "What is your mother's maiden name?"
      }
    ]
  }
}
```

**✅ What to Check:**
- Questions are returned with IDs
- Answers are NOT included (security!)
- Questions match what you submitted

---

### Test 5: Login with 2FA (Security Questions)

Now that 2FA is enabled, logging in requires answering security questions.

#### Step 5.1: Initial Login
**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "2FA verification required",
  "data": {
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "require2FA": true,
    "availableMethods": ["security_question"],
    "questions": [
      {
        "id": 1,
        "question": "What was your first pet's name?"
      },
      {
        "id": 2,
        "question": "In what city were you born?"
      },
      {
        "id": 3,
        "question": "What is your mother's maiden name?"
      }
    ]
  }
}
```

**✅ What to Check:**
- `require2FA` is `true`
- You receive a `tempToken`
- Questions are included
- Save the `tempToken` for next step

#### Step 5.2: Verify with Security Questions
**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "YOUR_TEMP_TOKEN_FROM_STEP_5.1",
    "method": "security_question",
    "answers": [
      { "id": 1, "answer": "Fluffy" },
      { "id": 2, "answer": "New York" },
      { "id": 3, "answer": "Smith" }
    ]
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user_id",
      "email": "test@example.com",
      ...
    }
  }
}
```

**✅ What to Check:**
- Login completes successfully
- You receive `accessToken` and `refreshToken`
- User data is returned

---

### Test 6: Case Insensitivity Test

Try answering with different cases. All should work:

**Test 6.1: All Lowercase**
```json
{
  "answers": [
    { "id": 1, "answer": "fluffy" },
    { "id": 2, "answer": "new york" },
    { "id": 3, "answer": "smith" }
  ]
}
```
**Expected:** ✅ Success

**Test 6.2: All Uppercase**
```json
{
  "answers": [
    { "id": 1, "answer": "FLUFFY" },
    { "id": 2, "answer": "NEW YORK" },
    { "id": 3, "answer": "SMITH" }
  ]
}
```
**Expected:** ✅ Success

**Test 6.3: Mixed Case**
```json
{
  "answers": [
    { "id": 1, "answer": "fLuFfY" },
    { "id": 2, "answer": "NeW yOrK" },
    { "id": 3, "answer": "sMiTh" }
  ]
}
```
**Expected:** ✅ Success

---

### Test 7: Whitespace Handling Test

**Test 7.1: Leading/Trailing Spaces**
```json
{
  "answers": [
    { "id": 1, "answer": "  Fluffy  " },
    { "id": 2, "answer": "  New York  " },
    { "id": 3, "answer": "  Smith  " }
  ]
}
```
**Expected:** ✅ Success (spaces are trimmed)

---

### Test 8: Wrong Answers Test

**Request:**
```json
{
  "tempToken": "YOUR_TEMP_TOKEN",
  "method": "security_question",
  "answers": [
    { "id": 1, "answer": "WrongAnswer" },
    { "id": 2, "answer": "New York" },
    { "id": 3, "answer": "Smith" }
  ]
}
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Invalid verification code"
}
```

**✅ What to Check:**
- Login fails with error
- Attempt is logged in database

---

### Test 9: Partial Answers Test

**Request (Only 2 out of 3 answers):**
```json
{
  "tempToken": "YOUR_TEMP_TOKEN",
  "method": "security_question",
  "answers": [
    { "id": 1, "answer": "Fluffy" },
    { "id": 2, "answer": "New York" }
  ]
}
```

**Expected:** 
- Current implementation: ✅ Success (only validates provided answers)
- Recommended: Should require all questions to be answered

---

### Test 10: Rate Limiting Test

Try 6 consecutive failed attempts:

**Attempt 1-5:** Wrong answers - should fail with "Invalid verification code"
**Attempt 6:** Should fail with:
```json
{
  "status": "error",
  "message": "Too many failed attempts. Please try again in 30 minutes."
}
```

**✅ What to Check:**
- After 5 failed attempts, user is locked out
- Must wait 30 minutes or use backup code

---

### Test 11: Backup Code Test

If you get locked out or want to test backup codes:

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "YOUR_TEMP_TOKEN",
    "method": "backup_code",
    "code": "A3F2B8C1"
  }'
```
(Use one of the backup codes from Test 2)

**Expected:** ✅ Success
**Note:** Each backup code can only be used once

---

### Test 12: Validation Tests

**Test 12.1: Too Few Questions (< 3)**
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      { "question": "Test question 1?", "answer": "Answer1" },
      { "question": "Test question 2?", "answer": "Answer2" }
    ]
  }'
```
**Expected:** ❌ Error - "Must provide at least 3 security questions"

**Test 12.2: Too Many Questions (> 5)**
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      { "question": "Question 1?", "answer": "A1" },
      { "question": "Question 2?", "answer": "A2" },
      { "question": "Question 3?", "answer": "A3" },
      { "question": "Question 4?", "answer": "A4" },
      { "question": "Question 5?", "answer": "A5" },
      { "question": "Question 6?", "answer": "A6" }
    ]
  }'
```
**Expected:** ❌ Error - "Maximum 5 security questions allowed"

**Test 12.3: Question Too Short (< 5 chars)**
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      { "question": "Q1?", "answer": "Answer1" },
      { "question": "What is your name?", "answer": "John" },
      { "question": "Where do you live?", "answer": "USA" }
    ]
  }'
```
**Expected:** ❌ Error - "Question must be at least 5 characters"

**Test 12.4: Answer Too Short (< 2 chars)**
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      { "question": "What is your pet'\''s name?", "answer": "A" },
      { "question": "What city were you born?", "answer": "NY" },
      { "question": "What is your mother'\''s name?", "answer": "Sue" }
    ]
  }'
```
**Expected:** ❌ Error - "Answer must be at least 2 characters"

---

### Test 13: Disable Security Questions

**Request:**
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/disable \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Security questions disabled successfully"
}
```

**Verify it's disabled:**
```bash
curl -X GET http://localhost:3000/api/2fa/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:**
```json
{
  "data": {
    "is2FAEnabled": false,
    "methods": {
      "securityQuestion": {
        "enabled": false,
        "count": 0
      }
    }
  }
}
```

---

### Test 14: Re-enable Security Questions

**Request:**
Setup again with new or same questions
```bash
curl -X POST http://localhost:3000/api/2fa/security-questions/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      { "question": "What was your first pet'\''s name?", "answer": "Fluffy" },
      { "question": "In what city were you born?", "answer": "New York" },
      { "question": "What is your mother'\''s maiden name?", "answer": "Smith" }
    ]
  }'
```

**Expected:** ✅ Success with new backup codes

---

## Database Verification

You can verify the data directly in the database:

### Check Stored Questions
```sql
SELECT * FROM user_security_question WHERE user_id = 'YOUR_USER_ID';
```

**What to verify:**
- Questions are stored in plain text
- Answers are stored as bcrypt hashes (never plain text)

### Check 2FA Settings
```sql
SELECT * FROM user_2fa_settings WHERE user_id = 'YOUR_USER_ID';
```

**What to verify:**
- `security_question_enabled` is `TRUE`
- `is_2fa_enabled` is `TRUE`

### Check Attempt Log
```sql
SELECT * FROM user_2fa_attempt 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

**What to verify:**
- Each verification attempt is logged
- `method` is 'security_question'
- `success` shows TRUE or FALSE
- `ip_address` is captured

### Check Backup Codes
```sql
SELECT id, is_used, used_at, created_at 
FROM user_2fa_backup_code 
WHERE user_id = 'YOUR_USER_ID';
```

**What to verify:**
- 10 codes are created
- Codes are hashed (not plain text)
- `is_used` tracks usage

---

## Test Results Checklist

Mark each test as you complete it:

- [ ] Test 1: Initial 2FA status
- [ ] Test 2: Setup security questions
- [ ] Test 3: Verify 2FA status after setup
- [ ] Test 4: Get security questions
- [ ] Test 5: Login with 2FA
- [ ] Test 6: Case insensitivity (lowercase, uppercase, mixed)
- [ ] Test 7: Whitespace handling
- [ ] Test 8: Wrong answers rejection
- [ ] Test 9: Partial answers (currently passes, may need fix)
- [ ] Test 10: Rate limiting (5 failed attempts)
- [ ] Test 11: Backup codes
- [ ] Test 12: Validation (min/max questions, length limits)
- [ ] Test 13: Disable security questions
- [ ] Test 14: Re-enable security questions

---

## Known Issues / Observations

### ✅ Working Correctly
1. ✅ Answers are hashed with bcrypt
2. ✅ Case-insensitive comparison works
3. ✅ Whitespace trimming works
4. ✅ Rate limiting prevents brute force
5. ✅ Backup codes provide emergency access
6. ✅ All attempts are logged
7. ✅ Validation enforces min/max constraints

### ⚠️ Potential Improvements
1. ⚠️ **Partial Answers**: Currently allows answering only some questions. Best practice would require all questions to be answered.
2. ⚠️ **Answer Complexity**: Allows very short answers (2 chars). Consider requiring longer answers.
3. ⚠️ **Question Uniqueness**: No validation for duplicate questions.

---

## Troubleshooting

### "Unauthorized" Error
- Make sure you're using a valid access token
- Token might be expired - try logging in again

### "Authenticator not set up"
- You need to call `/2fa/security-questions/setup` first

### "Invalid verification code" (but answers are correct)
- Check for typos
- Remember: case doesn't matter, but spelling does
- Extra spaces are automatically trimmed

### "Too many failed attempts"
- Wait 30 minutes OR
- Use a backup code

### Server Not Running
```bash
# Check if server is running
lsof -ti:3000

# If not, start it
npm run dev
```

---

## Conclusion

If all tests pass, the security questions 2FA implementation is working correctly! 

The system provides:
- ✅ Secure storage (bcrypt hashing)
- ✅ User-friendly input handling (case-insensitive, trimmed)
- ✅ Brute force protection (rate limiting)
- ✅ Audit trail (attempt logging)
- ✅ Emergency access (backup codes)
- ✅ Input validation (Zod schemas)

**Next Steps:**
1. Review the implementation documentation: `docs/2FA-SECURITY-QUESTIONS.md`
2. Consider implementing the suggested improvements
3. Add automated tests to CI/CD pipeline

