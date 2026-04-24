from fastapi import APIRouter, Request, HTTPException
from api.schemas import ModelInfoResponse

router = APIRouter()


@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info(request: Request):
    model = request.app.state.model
    if model is None:
        raise HTTPException(status_code=503, detail="Model not ready")
    return ModelInfoResponse(
        accuracy=model.accuracy,
        estimators=model.estimator_names,
        feature_names=model.feature_names,
    )
