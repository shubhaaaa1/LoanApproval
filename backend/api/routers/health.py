from fastapi import APIRouter, Request, HTTPException

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    if request.app.state.model is None:
        raise HTTPException(status_code=503, detail="Model not ready")
    return {"status": "ok"}
