# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
**SECURITY: Access code validation and QR generation tests are NON-NEGOTIABLE**
- [ ] T004 [P] Contract test POST /api/access-codes/validate in tests/contract/test_access_codes.py
- [ ] T005 [P] Contract test POST /api/register in tests/contract/test_registration.py
- [ ] T006 [P] Contract test GET /api/qr-codes/{id} in tests/contract/test_qr_codes.py
- [ ] T007 [P] Integration test complete registration flow in tests/integration/test_registration_flow.py
- [ ] T008 [P] Security test access code one-time use in tests/security/test_access_code_security.py
- [ ] T009 [P] Performance test form submission <500ms in tests/performance/test_response_times.py

## Phase 3.3: Core Implementation (ONLY after tests are failing)
**SECURITY-FIRST: Cryptographically secure code generation and validation**
- [ ] T010 [P] AccessCode model with secure generation in src/models/access_code.py
- [ ] T011 [P] Participant model with validation in src/models/participant.py
- [ ] T012 [P] QRCode model and generation service in src/models/qr_code.py
- [ ] T013 [P] AccessCodeService with one-time validation in src/services/access_code_service.py
- [ ] T014 [P] RegistrationService with data validation in src/services/registration_service.py
- [ ] T015 [P] EmailService for secure QR delivery in src/services/email_service.py
- [ ] T016 POST /api/access-codes/validate endpoint with security checks
- [ ] T017 POST /api/register endpoint with comprehensive validation
- [ ] T018 GET /api/qr-codes/{id} endpoint with access controls
- [ ] T019 Input sanitization and server-side validation middleware
- [ ] T020 Error handling with user-friendly messages and security logging

## Phase 3.4: Integration
**UX CONSISTENCY: Bootstrap theming and mobile responsiveness**
- [ ] T021 Database connection with optimized indexing on access_codes and emails
- [ ] T022 Secure email service integration with TLS encryption
- [ ] T023 Frontend registration form with Bootstrap consistency
- [ ] T024 Real-time form validation with immediate user feedback
- [ ] T025 Admin dashboard with 1000+ registration performance optimization
- [ ] T026 Mobile-responsive design validation and testing
- [ ] T027 Asynchronous QR code generation and email delivery
- [ ] T028 Security headers and CORS configuration

## Phase 3.5: Polish
**CODE QUALITY: Documentation, performance validation, and maintainability**
- [ ] T029 [P] Unit tests for access code validation logic in tests/unit/test_access_code_validation.py
- [ ] T030 [P] Unit tests for email template rendering in tests/unit/test_email_templates.py
- [ ] T031 [P] Security audit of cryptographic functions in tests/security/test_crypto_audit.py
- [ ] T032 Performance validation: QR generation <2 seconds in tests/performance/test_qr_performance.py
- [ ] T033 Cross-browser email template testing in tests/integration/test_email_compatibility.py
- [ ] T034 [P] Database schema documentation in docs/database-schema.md
- [ ] T035 [P] API documentation update in docs/api.md
- [ ] T036 Code quality review and refactoring for single responsibility
- [ ] T037 Configuration externalization and environment validation
- [ ] T038 Final security review and penetration testing

## Dependencies
- Security tests (T004-T009) before implementation (T010-T020)
- T010 (AccessCode model) blocks T013 (AccessCodeService)
- T011 (Participant model) blocks T014 (RegistrationService)
- T012 (QRCode model) blocks T015 (EmailService), T027 (async generation)
- T023 (frontend form) requires T016-T018 (API endpoints)
- T025 (admin dashboard) requires T011, T014 (participant data)
- Implementation before polish and final validation (T029-T038)

## Parallel Example
```
# Launch T004-T009 together (different test files):
Task: "Contract test POST /api/access-codes/validate in tests/contract/test_access_codes.py"
Task: "Contract test POST /api/register in tests/contract/test_registration.py"
Task: "Integration test complete registration flow in tests/integration/test_registration_flow.py"
Task: "Security test access code one-time use in tests/security/test_access_code_security.py"
Task: "Performance test form submission <500ms in tests/performance/test_response_times.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task