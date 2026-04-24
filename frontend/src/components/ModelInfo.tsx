import { useEffect, useState } from "react";
import { getModelInfo, ApiError } from "../api/client";

export default function ModelInfo() {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModelInfo()
      .then((info) => setAccuracy(info.accuracy))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(`Failed to load model info: ${err.detail}`);
        } else {
          setError("Failed to load model info.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <span className="model-info-badge model-info-badge--loading">
        Loading model info…
      </span>
    );
  }

  if (error) {
    return (
      <span className="model-info-badge model-info-badge--error" role="alert">
        {error}
      </span>
    );
  }

  return (
    <span className="model-info-badge">
      Model Accuracy: {((accuracy ?? 0) * 100).toFixed(1)}%
    </span>
  );
}
