from fastapi import APIRouter, Request, HTTPException
from api.schemas import PredictRequest, PredictResponse
from ml.pipeline import predict

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
async def predict_loan(request: Request, body: PredictRequest):
    model = request.app.state.model
    if model is None:
        raise HTTPException(status_code=503, detail="Model not ready")

    feature_vector = [
        body.gender,
        body.married,
        body.dependents,
        body.education,
        body.self_employed,
        body.applicant_income,
        body.coapplicant_income,
        body.loan_amount,
        body.loan_amount_term,
        body.credit_history,
        body.property_area,
    ]

    label, confidence = predict(model, feature_vector)
    return PredictResponse(prediction=label, confidence=confidence)
