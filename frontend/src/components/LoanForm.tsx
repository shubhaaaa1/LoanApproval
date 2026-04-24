import { useRef, useState } from "react";
import { predictLoan, ApiError, TimeoutError } from "../api/client";
import type { FeatureVector, PredictResponse } from "../api/client";
import ResultCard from "./ResultCard";

type FormState = {
  gender: string;
  married: string;
  dependents: string;
  education: string;
  self_employed: string;
  applicant_income: string;
  coapplicant_income: string;
  loan_amount: string;
  loan_amount_term: string;
  credit_history: string;
  property_area: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  gender: "",
  married: "",
  dependents: "",
  education: "",
  self_employed: "",
  applicant_income: "",
  coapplicant_income: "",
  loan_amount: "",
  loan_amount_term: "",
  credit_history: "",
  property_area: "",
};

function encodeFormState(form: FormState): FeatureVector {
  return {
    gender: form.gender === "Male" ? 1 : 0,
    married: form.married === "Yes" ? 1 : 0,
    dependents: form.dependents === "3+" ? 3 : Number(form.dependents),
    education: form.education === "Graduate" ? 1 : 0,
    self_employed: form.self_employed === "Yes" ? 1 : 0,
    applicant_income: Number(form.applicant_income),
    coapplicant_income: Number(form.coapplicant_income),
    loan_amount: Number(form.loan_amount),
    loan_amount_term: Number(form.loan_amount_term),
    credit_history: form.credit_history === "Has Credit History" ? 1 : 0,
    property_area:
      form.property_area === "Rural" ? 0 : form.property_area === "Semiurban" ? 1 : 2,
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  const requiredSelects: (keyof FormState)[] = [
    "gender", "married", "dependents", "education",
    "self_employed", "credit_history", "property_area",
  ];
  for (const field of requiredSelects) {
    if (!form[field]) {
      errors[field] = "This field is required.";
    }
  }

  if (!form.applicant_income) {
    errors.applicant_income = "This field is required.";
  } else if (Number(form.applicant_income) <= 0) {
    errors.applicant_income = "Applicant Income must be greater than zero.";
  }

  if (!form.loan_amount) {
    errors.loan_amount = "This field is required.";
  } else if (Number(form.loan_amount) <= 0) {
    errors.loan_amount = "Loan Amount must be greater than zero.";
  }

  if (!form.loan_amount_term) {
    errors.loan_amount_term = "This field is required.";
  } else if (Number(form.loan_amount_term) <= 0) {
    errors.loan_amount_term = "Loan Amount Term must be greater than zero.";
  }

  // coapplicant_income is optional (>= 0 is fine), but must be a number if provided
  if (form.coapplicant_income === "") {
    errors.coapplicant_income = "This field is required.";
  }

  return errors;
}

// Field order used to find the first invalid field for focus
const FIELD_ORDER: (keyof FormState)[] = [
  "gender", "married", "dependents", "education", "self_employed",
  "applicant_income", "coapplicant_income", "loan_amount", "loan_amount_term",
  "credit_history", "property_area",
];

export default function LoanForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Refs for each field to support focus-on-error
  const fieldRefs: Record<keyof FormState, React.RefObject<HTMLSelectElement | HTMLInputElement | null>> = {
    gender: useRef(null),
    married: useRef(null),
    dependents: useRef(null),
    education: useRef(null),
    self_employed: useRef(null),
    applicant_income: useRef(null),
    coapplicant_income: useRef(null),
    loan_amount: useRef(null),
    loan_amount_term: useRef(null),
    credit_history: useRef(null),
    property_area: useRef(null),
  };

  function handleChange(e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field on change
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setApiError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus the first invalid field
      const firstInvalid = FIELD_ORDER.find((f) => validationErrors[f]);
      if (firstInvalid) {
        fieldRefs[firstInvalid].current?.focus();
      }
      return;
    }

    setLoading(true);
    try {
      const response = await predictLoan(encodeFormState(form));
      setResult(response);
    } catch (err) {
      if (err instanceof TimeoutError) {
        setApiError("The request timed out. Please try again.");
      } else if (err instanceof ApiError) {
        setApiError(`Error ${err.status}: ${err.detail}`);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setApiError(null);
    setResult(null);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate>
        {/* Gender */}
        <div>
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={form.gender}
            onChange={handleChange}
            ref={fieldRefs.gender as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.gender ? "gender-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && <span id="gender-error" role="alert">{errors.gender}</span>}
        </div>

        {/* Married */}
        <div>
          <label htmlFor="married">Married</label>
          <select
            id="married"
            name="married"
            value={form.married}
            onChange={handleChange}
            ref={fieldRefs.married as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.married ? "married-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          {errors.married && <span id="married-error" role="alert">{errors.married}</span>}
        </div>

        {/* Dependents */}
        <div>
          <label htmlFor="dependents">Dependents</label>
          <select
            id="dependents"
            name="dependents"
            value={form.dependents}
            onChange={handleChange}
            ref={fieldRefs.dependents as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.dependents ? "dependents-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3+">3+</option>
          </select>
          {errors.dependents && <span id="dependents-error" role="alert">{errors.dependents}</span>}
        </div>

        {/* Education */}
        <div>
          <label htmlFor="education">Education</label>
          <select
            id="education"
            name="education"
            value={form.education}
            onChange={handleChange}
            ref={fieldRefs.education as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.education ? "education-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="Graduate">Graduate</option>
            <option value="Not Graduate">Not Graduate</option>
          </select>
          {errors.education && <span id="education-error" role="alert">{errors.education}</span>}
        </div>

        {/* Self Employed */}
        <div>
          <label htmlFor="self_employed">Self Employed</label>
          <select
            id="self_employed"
            name="self_employed"
            value={form.self_employed}
            onChange={handleChange}
            ref={fieldRefs.self_employed as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.self_employed ? "self_employed-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          {errors.self_employed && <span id="self_employed-error" role="alert">{errors.self_employed}</span>}
        </div>

        {/* Applicant Income */}
        <div>
          <label htmlFor="applicant_income">Applicant Income</label>
          <input
            id="applicant_income"
            name="applicant_income"
            type="number"
            value={form.applicant_income}
            onChange={handleChange}
            ref={fieldRefs.applicant_income as React.RefObject<HTMLInputElement>}
            aria-describedby={errors.applicant_income ? "applicant_income-error" : undefined}
            min="0"
          />
          {errors.applicant_income && <span id="applicant_income-error" role="alert">{errors.applicant_income}</span>}
        </div>

        {/* Coapplicant Income */}
        <div>
          <label htmlFor="coapplicant_income">Coapplicant Income</label>
          <input
            id="coapplicant_income"
            name="coapplicant_income"
            type="number"
            value={form.coapplicant_income}
            onChange={handleChange}
            ref={fieldRefs.coapplicant_income as React.RefObject<HTMLInputElement>}
            aria-describedby={errors.coapplicant_income ? "coapplicant_income-error" : undefined}
            min="0"
          />
          {errors.coapplicant_income && <span id="coapplicant_income-error" role="alert">{errors.coapplicant_income}</span>}
        </div>

        {/* Loan Amount */}
        <div>
          <label htmlFor="loan_amount">Loan Amount</label>
          <input
            id="loan_amount"
            name="loan_amount"
            type="number"
            value={form.loan_amount}
            onChange={handleChange}
            ref={fieldRefs.loan_amount as React.RefObject<HTMLInputElement>}
            aria-describedby={errors.loan_amount ? "loan_amount-error" : undefined}
            min="0"
          />
          {errors.loan_amount && <span id="loan_amount-error" role="alert">{errors.loan_amount}</span>}
        </div>

        {/* Loan Amount Term */}
        <div>
          <label htmlFor="loan_amount_term">Loan Amount Term</label>
          <input
            id="loan_amount_term"
            name="loan_amount_term"
            type="number"
            value={form.loan_amount_term}
            onChange={handleChange}
            ref={fieldRefs.loan_amount_term as React.RefObject<HTMLInputElement>}
            aria-describedby={errors.loan_amount_term ? "loan_amount_term-error" : undefined}
            min="0"
          />
          {errors.loan_amount_term && <span id="loan_amount_term-error" role="alert">{errors.loan_amount_term}</span>}
        </div>

        {/* Credit History */}
        <div>
          <label htmlFor="credit_history">Credit History</label>
          <select
            id="credit_history"
            name="credit_history"
            value={form.credit_history}
            onChange={handleChange}
            ref={fieldRefs.credit_history as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.credit_history ? "credit_history-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="Has Credit History">Has Credit History</option>
            <option value="No Credit History">No Credit History</option>
          </select>
          {errors.credit_history && <span id="credit_history-error" role="alert">{errors.credit_history}</span>}
        </div>

        {/* Property Area */}
        <div>
          <label htmlFor="property_area">Property Area</label>
          <select
            id="property_area"
            name="property_area"
            value={form.property_area}
            onChange={handleChange}
            ref={fieldRefs.property_area as React.RefObject<HTMLSelectElement>}
            aria-describedby={errors.property_area ? "property_area-error" : undefined}
          >
            <option value="">Select...</option>
            <option value="Urban">Urban</option>
            <option value="Rural">Rural</option>
            <option value="Semiurban">Semiurban</option>
          </select>
          {errors.property_area && <span id="property_area-error" role="alert">{errors.property_area}</span>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      {loading && <p role="status" aria-live="polite">Loading...</p>}

      {apiError && (
        <div role="alert">
          <p>{apiError}</p>
          <button type="button" onClick={handleRetry}>Try again</button>
        </div>
      )}

      {result && <ResultCard prediction={result.prediction} confidence={result.confidence} />}
    </div>
  );
}
