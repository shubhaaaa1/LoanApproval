type ResultCardProps = {
  prediction: string;
  confidence: number;
};

export default function ResultCard({ prediction, confidence }: ResultCardProps) {
  const isApproved = prediction === "Approved";
  const className = `result-card ${isApproved ? "result-card--approved" : "result-card--rejected"}`;

  return (
    <div className={className} role="status" aria-live="polite">
      <p className="result-card__label">{prediction}</p>
      <p className="result-card__confidence">Confidence: {(confidence * 100).toFixed(1)}%</p>
    </div>
  );
}
