# Implementation Plan: Loan Approval Prediction System

## Overview

Implement a two-tier web application: a Python FastAPI backend that trains a VotingClassifier ensemble on startup and exposes prediction/health/model-info endpoints, and a React TypeScript SPA that collects applicant inputs, validates them, and displays prediction results.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create `backend/` directory with `api/routers/`, `api/`, and `ml/` subdirectories
  - Create `frontend/` directory via `npm create vite@latest` (React + TypeScript template)
  - Add `fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `hypothesis`, `pytest`, `httpx` to `backend/requirements.txt`
  - Add `vitest`, `@testing-library/react`, `@testing-library/user-event` to frontend dev dependencies
  - _Requirements: 3.1, 4.1_

- [x] 2. Implement ML pipeline
  - [x] 2.1 Implement `ml/pipeline.py` with `train()` and `predict()` functions
    - `train(csv_path)`: load CSV, mean/mode impute missing values, encode categoricals, stratified 80/20 split, fit `VotingClassifier(estimators=[lr, dt, rf], voting='hard')`, log accuracy, return `TrainedModel` dataclass
    - `predict(model, feature_vector)`: run hard-voting prediction, compute confidence as fraction of estimators voting for majority class, return `(label, confidence)` tuple
    - Log WARNING if accuracy < 0.70
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.3_

  - [ ]* 2.2 Write property test for feature vector encoding round-trip (Property 1)
    - **Property 1: Feature vector encoding is deterministic and reversible**
    - **Validates: Requirements 2.1, 3.4**
    - Use `hypothesis` `@given` with valid categorical + numeric strategies, encode to Feature_Vector, decode back, assert equality
    - Tag: `# Feature: loan-approval-prediction-system, Property 1: encoding round-trip`

  - [ ]* 2.3 Write property test for prediction output validity (Property 2)
    - **Property 2: Prediction output is always a valid label with a valid confidence**
    - **Validates: Requirements 2.2, 4.1**
    - Use `hypothesis` to generate valid 11-field Feature_Vectors, call `predict`, assert label ∈ `{"Approved","Rejected"}` and confidence ∈ `[0.0, 1.0]`
    - Tag: `# Feature: loan-approval-prediction-system, Property 2: prediction output validity`

  - [ ]* 2.4 Write property test for confidence matching voting fraction (Property 5)
    - **Property 5: Confidence score matches voting fraction**
    - **Validates: Requirements 2.2**
    - Assert confidence ∈ `{1/3, 2/3, 1.0}` for any Feature_Vector (hard voting with 3 estimators)
    - Tag: `# Feature: loan-approval-prediction-system, Property 5: confidence voting fraction`

  - [ ]* 2.5 Write unit tests for `ml/pipeline.py`
    - Assert `train()` returns a `TrainedModel` with a `VotingClassifier`, accuracy float in `[0, 1]`, correct feature count
    - Assert `predict()` returns label in `{"Approved","Rejected"}` and confidence in `[0, 1]`
    - _Requirements: 3.2, 3.5, 3.6_

- [x] 3. Implement API schemas and core app
  - [x] 3.1 Implement `api/schemas.py` with Pydantic models
    - `PredictRequest`: 11 fields with `Field(gt=0)` on `applicant_income`, `loan_amount`, `loan_amount_term`; `Field(ge=0)` on `coapplicant_income`
    - `PredictResponse`: `prediction: str`, `confidence: float`
    - `ModelInfoResponse`: `accuracy: float`, `estimators: list[str]`, `feature_names: list[str]`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.2 Implement `api/main.py` FastAPI application
    - Register lifespan startup event that calls `ml/pipeline.py::train()` and stores `TrainedModel` in app state
    - Mount `CORSMiddleware` with configurable allowed origins
    - Register routers for `/predict`, `/health`, `/model-info`
    - Return HTTP 503 `{"detail": "Model not ready"}` if model not yet loaded
    - _Requirements: 3.1, 4.4, 4.5_

  - [ ]* 3.3 Write unit tests for `api/schemas.py`
    - Assert Pydantic validation rejects missing fields (expect `ValidationError`)
    - Assert validation rejects non-positive `applicant_income`, `loan_amount`, `loan_amount_term`
    - _Requirements: 4.2, 4.3_

- [x] 4. Implement API routers
  - [x] 4.1 Implement `api/routers/health.py`
    - `GET /health` returns HTTP 200 `{"status": "ok"}` when model is loaded
    - _Requirements: 4.4_

  - [x] 4.2 Implement `api/routers/model_info.py`
    - `GET /model-info` returns `ModelInfoResponse` with accuracy, estimator names, feature names from app state
    - _Requirements: 5.1_

  - [x] 4.3 Implement `api/routers/predict.py`
    - `POST /predict` validates `PredictRequest`, calls `ml/pipeline.py::predict()`, returns `PredictResponse`
    - Return HTTP 422 for missing/invalid fields (Pydantic handles automatically)
    - _Requirements: 4.1, 4.2, 4.3, 2.2_

  - [ ]* 4.4 Write property test for API payload rejection (Property 3)
    - **Property 3: API rejects incomplete or out-of-range payloads**
    - **Validates: Requirements 4.2, 4.3, 1.2, 1.3**
    - Use `hypothesis` to generate payloads with missing fields or non-positive income/amount/term, POST via `httpx` test client, assert HTTP 422
    - Tag: `# Feature: loan-approval-prediction-system, Property 3: API rejects invalid payloads`

  - [ ]* 4.5 Write property test for model accuracy consistency (Property 4)
    - **Property 4: Model accuracy is logged and exposed consistently**
    - **Validates: Requirements 3.6, 5.1**
    - Train model with fixed seed, compare logged accuracy to `/model-info` response accuracy, assert equality
    - Tag: `# Feature: loan-approval-prediction-system, Property 4: accuracy consistency`

  - [ ]* 4.6 Write integration tests for API endpoints
    - Full startup → `GET /health` returns 200
    - `POST /predict` with known fixture input returns expected label
    - `GET /model-info` returns all required fields with correct types
    - CORS headers present on responses
    - _Requirements: 4.4, 4.5, 5.1_

- [x] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement React frontend API client and model info
  - [x] 6.1 Implement `src/api/client.ts`
    - `predictLoan(featureVector)`: POST to `/predict` with 5-second `AbortController` timeout, throw typed errors for HTTP errors and timeouts
    - `getModelInfo()`: GET `/model-info`, return `ModelInfoResponse`
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 6.2 Implement `src/components/ModelInfo.tsx`
    - Fetch `GET /model-info` on mount, display accuracy as a percentage badge
    - _Requirements: 5.2_

  - [ ]* 6.3 Write unit tests for `ModelInfo`
    - Mock `getModelInfo()`, assert accuracy percentage renders correctly
    - _Requirements: 5.2_

- [x] 7. Implement loan application form
  - [x] 7.1 Implement `src/components/LoanForm.tsx` with all 11 fields
    - Render controlled inputs: dropdowns for Gender, Married, Dependents, Education, Self_Employed, Credit_History, Property_Area with exact option values per requirements
    - Render numeric inputs for ApplicantIncome, CoapplicantIncome, LoanAmount, Loan_Amount_Term
    - Associate every input with a visible `<label>` element
    - _Requirements: 1.1, 1.4, 6.2_

  - [x] 7.2 Add client-side validation and submission logic to `LoanForm.tsx`
    - On submit: validate all required fields non-empty, validate positive values for income/amount/term
    - Display inline validation errors; set focus to first invalid field
    - On valid submit: call `predictLoan()`, show `LoadingIndicator`, render `ResultCard` on success
    - On error/timeout: render `ErrorMessage` with retry affordance
    - _Requirements: 1.2, 1.3, 2.1, 2.3, 2.4, 2.5, 6.3, 6.4_

  - [x] 7.3 Implement `src/components/ResultCard.tsx`
    - Display prediction label (Approved / Rejected) and confidence as a percentage
    - _Requirements: 2.3_

  - [ ]* 7.4 Write unit tests for `LoanForm`
    - Submitting with empty fields shows validation errors and does not call `fetch`
    - Submitting with non-positive income shows validation error
    - Successful API response renders `ResultCard` with prediction and confidence
    - API timeout renders error message with retry button
    - Every input has an associated `<label>`; first invalid field receives focus on submit
    - _Requirements: 1.2, 1.3, 2.3, 2.4, 2.5, 6.2, 6.3_

- [x] 8. Apply responsive layout
  - Add CSS (or Tailwind/CSS modules) ensuring the form renders correctly from 320px to 1920px without horizontal scrolling
  - _Requirements: 6.1_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all backend and frontend tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `hypothesis` with `@settings(max_examples=100)` and are tagged with the property number
- The ML pipeline runs once at startup; no model persistence is needed for this version
- Backend: run with `uvicorn api.main:app --reload` from the `backend/` directory
- Frontend: run with `npm run dev` from the `frontend/` directory
