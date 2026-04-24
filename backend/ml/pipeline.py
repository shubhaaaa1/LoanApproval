"""
ML pipeline for Loan Approval Prediction System.

Provides train() and predict() functions using a VotingClassifier ensemble
(Logistic Regression, Decision Tree, Random Forest) with hard voting.
"""

import logging
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

logger = logging.getLogger(__name__)

# Ordered feature names matching the 11-field Feature_Vector
FEATURE_NAMES = [
    "Gender",
    "Married",
    "Dependents",
    "Education",
    "Self_Employed",
    "ApplicantIncome",
    "CoapplicantIncome",
    "LoanAmount",
    "Loan_Amount_Term",
    "Credit_History",
    "Property_Area",
]

# Columns that require mode (categorical) imputation
CATEGORICAL_COLUMNS = ["Gender", "Married", "Dependents", "Education", "Self_Employed", "Property_Area"]

# Columns that require mean (numeric) imputation
NUMERIC_COLUMNS = ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term", "Credit_History"]

# Encoding maps for categorical columns
ENCODING_MAPS = {
    "Gender": {"Male": 1, "Female": 0},
    "Married": {"Yes": 1, "No": 0},
    "Dependents": {"0": 0, "1": 1, "2": 2, "3+": 3},
    "Education": {"Graduate": 1, "Not Graduate": 0},
    "Self_Employed": {"Yes": 1, "No": 0},
    "Property_Area": {"Rural": 0, "Semiurban": 1, "Urban": 2},
    "Loan_Status": {"Y": 1, "N": 0},
}

ACCURACY_WARNING_THRESHOLD = 0.70


@dataclass
class TrainedModel:
    classifier: VotingClassifier
    accuracy: float
    estimator_names: list[str] = field(default_factory=list)
    feature_names: list[str] = field(default_factory=list)


def _impute(df: pd.DataFrame) -> pd.DataFrame:
    """Apply mean imputation for numeric columns and mode imputation for categorical columns."""
    df = df.copy()
    for col in CATEGORICAL_COLUMNS:
        if col in df.columns and df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mode()[0])
    for col in NUMERIC_COLUMNS:
        if col in df.columns and df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mean())
    return df


def _encode(df: pd.DataFrame) -> pd.DataFrame:
    """Encode categorical columns to numeric values using predefined maps."""
    df = df.copy()
    for col, mapping in ENCODING_MAPS.items():
        if col in df.columns:
            df[col] = df[col].map(mapping)
    return df


def train(csv_path: str) -> TrainedModel:
    """
    Load CSV, impute missing values, encode categoricals, perform stratified 80/20 split,
    fit a VotingClassifier ensemble, log accuracy, and return a TrainedModel.

    Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.3
    """
    df = pd.read_csv(csv_path)

    # Drop Loan_ID if present — not a predictive feature
    if "Loan_ID" in df.columns:
        df = df.drop("Loan_ID", axis=1)

    # Impute missing values (mode for categoricals, mean for numerics)
    df = _impute(df)

    # Encode categorical columns to numeric
    df = _encode(df)

    X = df[FEATURE_NAMES]
    y = df["Loan_Status"]

    # Stratified 80/20 split on Loan_Status
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # Build VotingClassifier with hard voting
    lr = LogisticRegression(max_iter=1000, random_state=42)
    dt = DecisionTreeClassifier(random_state=42)
    rf = RandomForestClassifier(random_state=42)

    classifier = VotingClassifier(
        estimators=[("lr", lr), ("dt", dt), ("rf", rf)],
        voting="hard",
    )
    classifier.fit(X_train, y_train)

    accuracy = float(classifier.score(X_test, y_test))

    logger.info("Ensemble model accuracy on test set: %.4f", accuracy)
    print(f"Model accuracy: {accuracy:.4f}")

    if accuracy < ACCURACY_WARNING_THRESHOLD:
        logger.warning(
            "Model accuracy %.4f is below the %.0f%% threshold.",
            accuracy,
            ACCURACY_WARNING_THRESHOLD * 100,
        )

    estimator_names = [name for name, _ in classifier.estimators]

    return TrainedModel(
        classifier=classifier,
        accuracy=accuracy,
        estimator_names=estimator_names,
        feature_names=list(FEATURE_NAMES),
    )


def predict(model: TrainedModel, feature_vector: list) -> tuple[str, float]:
    """
    Run hard-voting prediction on the given feature vector.

    Confidence is computed as the fraction of base estimators that voted
    for the majority class (one of 1/3, 2/3, or 1.0 for 3 estimators).

    Returns:
        (label, confidence) where label is "Approved" or "Rejected".

    Requirements: 3.2, 2.2
    """
    X = np.array(feature_vector).reshape(1, -1)

    # Collect individual estimator predictions
    votes = []
    for estimator in model.classifier.estimators_:
        vote = estimator.predict(X)[0]
        votes.append(int(vote))

    # Majority vote
    approved_votes = sum(votes)
    rejected_votes = len(votes) - approved_votes

    if approved_votes >= rejected_votes:
        majority_class = 1
        confidence = approved_votes / len(votes)
    else:
        majority_class = 0
        confidence = rejected_votes / len(votes)

    label = "Approved" if majority_class == 1 else "Rejected"
    return label, float(confidence)
