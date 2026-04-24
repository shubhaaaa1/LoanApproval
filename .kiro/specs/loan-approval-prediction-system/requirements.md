# Requirements Document

## Introduction

The Loan Approval Prediction System is a web application that allows users to submit loan application details through a React frontend and receive an instant approval prediction powered by an ensemble machine learning model on the backend. The system replaces the existing Streamlit prototype with a production-oriented architecture: a Python REST API serving a VotingClassifier ensemble (Logistic Regression, Decision Tree, Random Forest) trained on historical loan data, and a React single-page application that collects applicant inputs and displays the prediction result.

## Glossary

- **System**: The complete Loan Approval Prediction System, including frontend and backend.
- **Frontend**: The React single-page application served to the user's browser.
- **API**: The Python REST backend that exposes prediction and model-info endpoints.
- **Ensemble_Model**: The VotingClassifier composed of Logistic Regression, Decision Tree, and Random Forest estimators.
- **Applicant**: A person submitting loan details through the Frontend.
- **Prediction**: The binary outcome (Approved / Rejected) returned by the Ensemble_Model.
- **Feature_Vector**: The ordered set of 11 numerical values derived from applicant inputs and passed to the Ensemble_Model.
- **Loan_Dataset**: The CSV file (`loan_dataset.csv`) containing historical loan records used to train the Ensemble_Model.
- **Confidence_Score**: The proportion of base estimators in the Ensemble_Model that voted for the majority class.

---

## Requirements

### Requirement 1: Applicant Input Form

**User Story:** As an Applicant, I want to fill in my personal and financial details in a form, so that I can submit them for a loan approval prediction.

#### Acceptance Criteria

1. THE Frontend SHALL render an input form containing fields for: Gender, Marital Status, Number of Dependents, Education level, Self-Employment status, Applicant Income, Co-applicant Income, Loan Amount, Loan Amount Term, Credit History, and Property Area.
2. WHEN an Applicant submits the form with one or more required fields left empty, THE Frontend SHALL display an inline validation error for each missing field and SHALL NOT submit the request to the API.
3. WHEN an Applicant enters a non-positive value for Applicant Income, Loan Amount, or Loan Amount Term, THE Frontend SHALL display a validation error stating the field must be greater than zero.
4. THE Frontend SHALL provide dropdown selectors for categorical fields (Gender, Marital Status, Dependents, Education, Self-Employment, Credit History, Property Area) with the exact options: Gender — Male/Female; Married — Yes/No; Dependents — 0/1/2/3+; Education — Graduate/Not Graduate; Self Employed — Yes/No; Credit History — Has Credit History/No Credit History; Property Area — Urban/Rural/Semiurban.

---

### Requirement 2: Prediction Request and Response

**User Story:** As an Applicant, I want to submit my details and receive an instant prediction, so that I know whether my loan is likely to be approved.

#### Acceptance Criteria

1. WHEN an Applicant submits a valid form, THE Frontend SHALL send an HTTP POST request to the API `/predict` endpoint containing the Feature_Vector encoded as JSON.
2. WHEN the API receives a valid `/predict` request, THE API SHALL return a JSON response containing the Prediction label ("Approved" or "Rejected") and the Confidence_Score within 3 seconds.
3. WHEN the API returns a successful response, THE Frontend SHALL display the Prediction label and Confidence_Score to the Applicant without a full page reload.
4. IF the API returns an HTTP error response, THEN THE Frontend SHALL display a human-readable error message and SHALL allow the Applicant to resubmit the form.
5. IF the API does not respond within 5 seconds, THEN THE Frontend SHALL display a timeout error message and SHALL allow the Applicant to resubmit the form.

---

### Requirement 3: Ensemble Model Training

**User Story:** As a developer, I want the backend to train an ensemble model on startup, so that predictions are based on the full historical dataset.

#### Acceptance Criteria

1. WHEN the API starts, THE API SHALL load the Loan_Dataset from `loan_dataset.csv` and train the Ensemble_Model before accepting any requests.
2. THE Ensemble_Model SHALL be a VotingClassifier composed of at least three base estimators: Logistic Regression, Decision Tree Classifier, and Random Forest Classifier, using hard voting.
3. WHEN training the Ensemble_Model, THE API SHALL apply mean/mode imputation to handle missing values in the Loan_Dataset.
4. WHEN training the Ensemble_Model, THE API SHALL encode all categorical columns in the Loan_Dataset to numeric values before fitting.
5. THE API SHALL split the Loan_Dataset into a training set (80%) and a test set (20%) using stratified sampling on the target column `Loan_Status`.
6. WHEN training completes, THE API SHALL log the Ensemble_Model's accuracy on the test set to standard output.

---

### Requirement 4: Prediction Endpoint

**User Story:** As a developer, I want a well-defined REST endpoint for predictions, so that the Frontend can reliably consume it.

#### Acceptance Criteria

1. THE API SHALL expose a `POST /predict` endpoint that accepts a JSON body with exactly 11 numeric fields corresponding to the Feature_Vector.
2. IF the request body is missing one or more required fields, THEN THE API SHALL return HTTP 422 with a JSON error body listing the missing fields.
3. IF a field value is outside the expected range (e.g., negative income), THEN THE API SHALL return HTTP 422 with a descriptive error message.
4. THE API SHALL expose a `GET /health` endpoint that returns HTTP 200 and a JSON body `{"status": "ok"}` when the Ensemble_Model is loaded and ready.
5. THE API SHALL include CORS headers permitting requests from the Frontend's origin so that browser-based requests are not blocked.

---

### Requirement 5: Model Performance Transparency

**User Story:** As an Applicant, I want to see how reliable the model is, so that I can trust the prediction result.

#### Acceptance Criteria

1. THE API SHALL expose a `GET /model-info` endpoint that returns the Ensemble_Model's test-set accuracy, the list of base estimator names, and the feature names used during training.
2. WHEN the Frontend loads, THE Frontend SHALL fetch model information from `GET /model-info` and display the Ensemble_Model's accuracy as a percentage in the UI.
3. WHEN the Ensemble_Model's test-set accuracy is below 70%, THE API SHALL log a warning to standard output during startup.

---

### Requirement 6: Responsive and Accessible UI

**User Story:** As an Applicant, I want the application to work on both desktop and mobile browsers, so that I can submit applications from any device.

#### Acceptance Criteria

1. THE Frontend SHALL render correctly on viewport widths from 320px to 1920px without horizontal scrolling.
2. THE Frontend SHALL associate every form input with a visible label element so that screen readers can identify each field.
3. WHEN a validation error is displayed, THE Frontend SHALL set focus to the first invalid field so that keyboard and screen-reader users are informed immediately.
4. THE Frontend SHALL display a loading indicator while awaiting the API response so that the Applicant is aware the request is in progress.
