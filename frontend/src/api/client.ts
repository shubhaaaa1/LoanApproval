const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Typed error classes

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string
  ) {
    super(`API error ${status}: ${detail}`);
    this.name = "ApiError";
  }
}

export class TimeoutError extends Error {
  constructor() {
    super("Request timed out after 5 seconds");
    this.name = "TimeoutError";
  }
}

// Request / response types

export interface FeatureVector {
  gender: number;
  married: number;
  dependents: number;
  education: number;
  self_employed: number;
  applicant_income: number;
  coapplicant_income: number;
  loan_amount: number;
  loan_amount_term: number;
  credit_history: number;
  property_area: number;
}

export interface PredictResponse {
  prediction: string;
  confidence: number;
}

export interface ModelInfoResponse {
  accuracy: number;
  estimators: string[];
  feature_names: string[];
}

// API functions

export async function predictLoan(featureVector: FeatureVector): Promise<PredictResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(featureVector),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: response.statusText }));
      throw new ApiError(response.status, body.detail ?? response.statusText);
    }

    return response.json() as Promise<PredictResponse>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw new TimeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getModelInfo(): Promise<ModelInfoResponse> {
  const response = await fetch(`${BASE_URL}/model-info`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, body.detail ?? response.statusText);
  }

  return response.json() as Promise<ModelInfoResponse>;
}
