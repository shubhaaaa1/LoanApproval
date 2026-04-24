from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    gender: int
    married: int
    dependents: int
    education: int
    self_employed: int
    applicant_income: float = Field(gt=0)
    coapplicant_income: float = Field(ge=0)
    loan_amount: float = Field(gt=0)
    loan_amount_term: float = Field(gt=0)
    credit_history: int
    property_area: int


class PredictResponse(BaseModel):
    prediction: str  # "Approved" | "Rejected"
    confidence: float  # 0.0 – 1.0


class ModelInfoResponse(BaseModel):
    accuracy: float
    estimators: list[str]
    feature_names: list[str]
