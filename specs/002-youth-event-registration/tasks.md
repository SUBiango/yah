# Tasks: Youth Event Registration System

**Input**: Design documents from `/specs/002-youth-event-registration/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Implementation plan found with web app structure
   → ✅ Tech stack: Node.js 18+, Express.js, MongoDB, vanilla HTML/CSS/JS
2. Load optional design documents:
   → ✅ data-model.md: 3 entities (AccessCode, Participant, Registration)
   → ✅ contracts/: 4 files (api.yaml, 3 test files covering 5 endpoints)
   → ✅ research.md: Technical decisions for crypto, DB operations, validation
3. Generate tasks by category:
   → ✅ Setup: Node.js project, MongoDB, dependencies, linting
   → ✅ Tests: 3 contract test files, integration scenarios, security tests
   → ✅ Core: 3 models, 5 services, 5 API endpoints
   → ✅ Integration: DB connections, email service, frontend forms, admin dashboard
   → ✅ Polish: unit tests, performance validation, documentation
4. Apply task rules:
   → ✅ Different files marked [P] for parallel execution
   → ✅ Same file tasks sequential (no [P])
   → ✅ All tests before implementation (TDD)
5. Number tasks sequentially (T001-T050)
6. Dependencies validated and documented
7. Parallel execution examples created
8. Validation checklist:
   → ✅ All 3 contract test files have corresponding tasks
   → ✅ All 3 entities have model creation tasks
   → ✅ All 5 API endpoints have implementation tasks
   → ✅ All tests scheduled before implementation
9. Return: SUCCESS (50 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`
- **Tests**: `backend/tests/`
- **Frontend**: Root directory (extends existing YAH website)

## Phase 3.1: Setup
- [ ] **T001** Create backend project structure with Express.js framework
- [ ] **T002** Initialize Node.js project in `backend/` with package.json dependencies: express@4.18+, mongodb@6.0+, nodemailer@6.9+, qrcode@1.5+, jest@29.0+, supertest@6.3+
- [ ] **T003** [P] Configure ESLint and Prettier for backend JavaScript code formatting in `backend/.eslintrc.js` and `backend/.prettierrc`
- [ ] **T004** [P] Set up MongoDB connection configuration in `backend/config/database.js` with environment variable support
- [ ] **T005** [P] Create environment configuration template `backend/.env.example` with all required variables (MONGODB_URI, ADMIN_PASSCODE, ZOHO_* variables)
- [ ] **T006** [P] Configure Jest testing framework in `backend/jest.config.js` with test environments and coverage settings

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
**SECURITY: Access code validation and QR generation tests are NON-NEGOTIABLE**

### Contract Tests (All Must Fail Initially)
- [ ] **T007** [P] Implement contract test for POST /api/access-codes/validate in `backend/tests/contract/access-code-validation.test.js` with 12 failing test cases
- [ ] **T008** [P] Implement contract test for POST /api/registrations in `backend/tests/contract/registration-api.test.js` with 15 failing test cases  
- [ ] **T009** [P] Implement contract test for admin endpoints in `backend/tests/contract/admin-api.test.js` with 8 failing test cases

### Integration Tests (Must Fail Initially)
- [ ] **T010** [P] Create integration test for complete registration flow in `backend/tests/integration/registration-flow.test.js` - access code validation → form submission → QR generation → email delivery
- [ ] **T011** [P] Create integration test for admin dashboard workflow in `backend/tests/integration/admin-workflow.test.js` - passcode authentication → participant listing → QR download
- [ ] **T012** [P] Create integration test for concurrent access code usage in `backend/tests/integration/race-condition.test.js` - multiple simultaneous registrations with same code

### Security Tests (Must Fail Initially)  
- [ ] **T013** [P] Create security test for access code one-time use enforcement in `backend/tests/security/access-code-security.test.js` - atomic operations, race condition prevention
- [ ] **T014** [P] Create security test for input validation and sanitization in `backend/tests/security/input-validation.test.js` - XSS prevention, SQL injection protection
- [ ] **T015** [P] Create security test for admin passcode protection in `backend/tests/security/admin-authentication.test.js` - brute force protection, session management

### Performance Tests (Must Fail Initially)
- [ ] **T016** [P] Create performance test for form submission response time in `backend/tests/performance/response-times.test.js` - <500ms target validation
- [ ] **T017** [P] Create performance test for QR code generation speed in `backend/tests/performance/qr-generation.test.js` - <2 seconds target validation  
- [ ] **T018** [P] Create performance test for admin dashboard with 500+ registrations in `backend/tests/performance/admin-dashboard-load.test.js`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
**SECURITY-FIRST: Cryptographically secure code generation and validation**

### Data Models
- [ ] **T019** [P] Create AccessCode model in `backend/src/models/AccessCode.js` with crypto.randomBytes generation, bcrypt hashing, and MongoDB schema validation
- [ ] **T020** [P] Create Participant model in `backend/src/models/Participant.js` with field validation rules, sanitization, and MongoDB schema
- [ ] **T021** [P] Create Registration model in `backend/src/models/Registration.js` with QR code path linking and relationship management

### Services Layer  
- [ ] **T022** [P] Create AccessCodeService in `backend/src/services/accessCodeService.js` with atomic findOneAndUpdate validation and one-time use enforcement
- [ ] **T023** [P] Create ParticipantService in `backend/src/services/participantService.js` with data validation, sanitization, and CRUD operations
- [ ] **T024** [P] Create RegistrationService in `backend/src/services/registrationService.js` with registration ID generation and workflow orchestration
- [ ] **T025** [P] Create QRCodeService in `backend/src/services/qrCodeService.js` with unique QR generation using qrcode package and file management  
- [ ] **T026** [P] Create EmailService in `backend/src/services/emailService.js` with Nodemailer + Zoho SMTP configuration and template rendering

### Middleware & Utilities
- [ ] **T027** [P] Create input validation middleware in `backend/src/middleware/validation.js` using express-validator with custom sanitization rules
- [ ] **T028** [P] Create security middleware in `backend/src/middleware/security.js` with rate limiting, CORS, and security headers
- [ ] **T029** [P] Create admin authentication middleware in `backend/src/middleware/adminAuth.js` with passcode validation and session management

### API Endpoints
- [ ] **T030** Create POST /api/access-codes/validate endpoint in `backend/src/routes/accessCode.js` with comprehensive validation and security checks
- [ ] **T031** Create POST /api/registrations endpoint in `backend/src/routes/registration.js` with full registration workflow and error handling
- [ ] **T032** Create POST /api/admin/authenticate endpoint in `backend/src/routes/admin.js` with passcode validation and rate limiting
- [ ] **T033** Create GET /api/admin/participants endpoint in `backend/src/routes/admin.js` with pagination, filtering, and search functionality  
- [ ] **T034** Create GET /api/admin/participants/:registrationId/qr endpoint in `backend/src/routes/admin.js` with QR code download and access control

### Application Setup
- [ ] **T035** Create main application entry point in `backend/src/app.js` with Express configuration, middleware setup, and route mounting
- [ ] **T036** Create server startup script in `backend/src/server.js` with database connection, environment validation, and graceful shutdown

## Phase 3.4: Integration & Frontend  
**UX CONSISTENCY: Bootstrap theming and mobile responsiveness**

### Database Integration
- [ ] **T037** Create database initialization script in `backend/scripts/initDatabase.js` with access code generation, indexing, and sample data
- [ ] **T038** Implement database connection pooling and error handling in `backend/config/database.js` with retry logic and health checks

### Frontend Pages
- [ ] **T039** [P] Create registration form page in `registration.html` extending existing YAH website with Bootstrap consistency and real-time validation
- [ ] **T040** [P] Create registration confirmation page in `confirmation.html` with QR code display, download functionality, and success messaging  
- [ ] **T041** [P] Create admin dashboard page in `admin.html` with passcode gate, participant listing, search/filter, and QR download capabilities

### Frontend JavaScript
- [ ] **T042** [P] Create registration form logic in `js/registration.js` with real-time validation, API integration, and user feedback
- [ ] **T043** [P] Create admin dashboard logic in `js/admin.js` with authentication, participant management, and QR download functionality
- [ ] **T044** [P] Create QR code display utilities in `js/qr-display.js` with download, print, and sharing capabilities

### Frontend Styling
- [ ] **T045** [P] Create registration system styles in `css/registration.css` extending existing Bootstrap theme with mobile responsiveness

## Phase 3.5: Polish & Production Readiness
**CODE QUALITY: Documentation, performance validation, and maintainability**

### Unit Tests
- [ ] **T046** [P] Create unit tests for access code generation and validation logic in `backend/tests/unit/accessCode.test.js`
- [ ] **T047** [P] Create unit tests for email template rendering and delivery in `backend/tests/unit/emailService.test.js`
- [ ] **T048** [P] Create unit tests for QR code generation and file management in `backend/tests/unit/qrCodeService.test.js`

### Documentation & Configuration
- [ ] **T049** [P] Create database schema documentation in `docs/database-schema.md` with entity relationships, indexes, and migration notes
- [ ] **T050** [P] Update API documentation in `docs/api.md` with OpenAPI specification, authentication details, and usage examples

## Dependencies & Execution Order

### Critical Dependencies
- **Setup Phase (T001-T006)** must complete before any other work
- **All Tests (T007-T018)** must be written and FAILING before any implementation tasks
- **Models (T019-T021)** must exist before dependent services
- **Services (T022-T026)** must exist before API endpoints
- **Middleware (T027-T029)** must exist before API endpoints  
- **API Endpoints (T030-T034)** must exist before frontend integration
- **Frontend (T039-T045)** depends on completed backend APIs

### Detailed Task Dependencies  
- T022 (AccessCodeService) requires T019 (AccessCode model)
- T023 (ParticipantService) requires T020 (Participant model)  
- T024 (RegistrationService) requires T019, T020, T021 (all models)
- T025 (QRCodeService) requires T021 (Registration model)
- T026 (EmailService) requires T025 (QRCodeService)
- T030 (access code endpoint) requires T022, T027, T028
- T031 (registration endpoint) requires T024, T025, T026, T027, T028
- T032-T034 (admin endpoints) require T023, T024, T029
- T039-T041 (frontend pages) require T030-T034 (API endpoints)
- T042-T044 (frontend JS) require T039-T041 (frontend pages)

## Parallel Execution Examples

### Setup Phase (Can Run Together)
```bash
# Launch T003, T004, T005, T006 simultaneously:
Task: "Configure ESLint and Prettier in backend/.eslintrc.js"
Task: "Set up MongoDB connection config in backend/config/database.js" 
Task: "Create environment template backend/.env.example"
Task: "Configure Jest testing in backend/jest.config.js"
```

### Contract Tests Phase (Can Run Together)  
```bash
# Launch T007, T008, T009 simultaneously:
Task: "Contract test POST /api/access-codes/validate in backend/tests/contract/access-code-validation.test.js"
Task: "Contract test POST /api/registrations in backend/tests/contract/registration-api.test.js"
Task: "Contract test admin endpoints in backend/tests/contract/admin-api.test.js"
```

### Integration & Security Tests (Can Run Together)
```bash
# Launch T010-T018 simultaneously:
Task: "Integration test complete registration flow in backend/tests/integration/registration-flow.test.js"
Task: "Integration test admin workflow in backend/tests/integration/admin-workflow.test.js" 
Task: "Security test access code one-time use in backend/tests/security/access-code-security.test.js"
Task: "Performance test form submission <500ms in backend/tests/performance/response-times.test.js"
```

### Models Phase (Can Run Together)
```bash  
# Launch T019, T020, T021 simultaneously:
Task: "Create AccessCode model in backend/src/models/AccessCode.js"
Task: "Create Participant model in backend/src/models/Participant.js"  
Task: "Create Registration model in backend/src/models/Registration.js"
```

### Services Phase (Can Run Together - After Models)
```bash
# Launch T022, T023, T025, T026 simultaneously (T024 depends on others):
Task: "Create AccessCodeService in backend/src/services/accessCodeService.js"
Task: "Create ParticipantService in backend/src/services/participantService.js"
Task: "Create QRCodeService in backend/src/services/qrCodeService.js" 
Task: "Create EmailService in backend/src/services/emailService.js"
```

### Frontend Phase (Can Run Together - After APIs)
```bash
# Launch T039, T040, T041, T042, T043, T044, T045 simultaneously:
Task: "Create registration form in registration.html"
Task: "Create confirmation page in confirmation.html"
Task: "Create admin dashboard in admin.html"
Task: "Registration form logic in js/registration.js"
Task: "Admin dashboard logic in js/admin.js"
```

## Validation Checklist
*GATE: Checked before execution begins*

- [x] All 3 contract test files have corresponding tasks (T007-T009)
- [x] All 3 entities have model creation tasks (T019-T021)  
- [x] All 5 API endpoints have implementation tasks (T030-T034)
- [x] All tests scheduled before implementation (TDD compliance)
- [x] Parallel tasks use different files (no conflicts)
- [x] Each task specifies exact file path
- [x] Dependencies clearly documented
- [x] Security-first approach maintained throughout
- [x] Performance requirements addressed in tests
- [x] Constitutional principles reflected in task structure

## Notes
- **[P] tasks** = different files, no dependencies, safe for parallel execution
- **Verify all tests FAIL** before implementing any functionality (TDD requirement)
- **Commit after each task** for proper version control and rollback capability  
- **Constitutional compliance** required at each phase gate
- **Security review** mandatory for T013-T015, T019, T022, T027-T029, T030-T034
- **Performance validation** required for T016-T018 before production deployment

## Success Criteria
- All 35 initial tests must fail before implementation begins
- All API contract tests must pass after endpoint implementation  
- All performance tests must meet constitutional targets (<500ms, <2s)
- All security tests must pass with no vulnerabilities detected
- Admin dashboard must handle 500+ registrations without degradation
- Mobile responsiveness must work on common youth devices
- Email integration must work reliably with Zoho SMTP
- QR codes must be unique, scannable, and properly linked to registrations