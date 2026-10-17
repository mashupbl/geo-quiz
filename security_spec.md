# Security Specification: GeoMaster Dynamic Question Bank

## 1. Data Invariants
1. **Questions**:
   - `id`: Must be a valid string identifier (max 128 characters, matching alphanumeric/hyphen/underscore).
   - `continent`: Must be one of the seven valid continents.
   - `difficulty`: Must be `'easy'`, `'medium'`, or `'hard'`.
   - `status`: Must be `'draft'`, `'published'`, or `'archived'`.
   - `questionText`: Non-empty string up to 2000 chars.
   - `options`: Must be a list of exactly 4 strings.
   - `correctAnswer`: Non-empty string up to 500 chars.
   - Published questions are readable by all students. The question bank collection supports listing with full-text and category filters.
   - Question creations and edits are strictly validated for structure, 4 options, bounds, and valid IDs.
2. **Aggregates** (`question_metadata/aggregates`):
   - High-performance counter document for published counts per continent, difficulty, and topic.
   - Readable by any client to render category cards and dynamic quiz pickers without expensive full-table queries.
3. **Quiz Attempts** (`quiz_attempts`):
   - Historical records frozen upon submission.
   - Once written, attempts are completely immutable (`update: if false`, `delete: if false`) to prevent grade tampering and historical data corruption.
   - Holds full question snapshot so questions can be updated in the bank without altering past quiz results.

## 2. The "Dirty Dozen" Payloads (Forbidden Attack Scenarios)
1. **Unpublished Question Snooping**: Unauthenticated learner attempting to list or read `status == 'draft'` questions.
2. **Ghost Field Poisoning**: Inserting unexpected fields (`isAdmin: true`, `backdoor: "xyz"`) during question creation.
3. **Giant Payload / Denial-of-Wallet**: Sending a 5MB question text or 10,000 options list to exhaust memory/storage quotas.
4. **Invalid Options Count**: Creating an MCQ with only 1 option or 10 options instead of exactly 4 options.
5. **ID Poisoning Attack**: Passing a document ID containing special path traversals or exceeding 128 characters.
6. **Student Answer Tampering (Attempt Mutation)**: Sending an `update` to an existing `quiz_attempts/{attemptId}` to change score from 20% to 100%.
7. **Attempt History Deletion**: Calling `delete` on historical `quiz_attempts` to erase low scores.
8. **Invalid Continent Injection**: Creating a question with continent `"Atlantis"`.
9. **Status Short-Circuit**: Injecting an invalid lifecycle state like `"super_published"`.
10. **Aggregates Tampering**: Non-authenticated write or corrupted structure into `question_metadata/aggregates`.
11. **Negative Score Injection**: Attempt record with negative score or total questions = 0.
12. **Orphan Attempt**: Creating an attempt with missing snapshot questions.
