import streamlit as st
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

st.set_page_config(page_title="Loan Approval Predictor", page_icon="💰", layout="centered")

st.title("💰 Loan Approval Prediction System")
st.markdown("""
Welcome to the intelligent Loan Approval Predictor. 
Fill out the details below and find out if your loan application might be approved.
""")

# Load and preprocess data
df = pd.read_csv("loan_dataset.csv")
df = pd.DataFrame(SimpleImputer(strategy='most_frequent').fit_transform(df), columns=df.columns)

if 'Loan_ID' in df.columns:
    df.drop('Loan_ID', axis=1, inplace=True)

le = LabelEncoder()
for col in df.columns:
    if df[col].dtype == 'object':
        df[col] = le.fit_transform(df[col])

X = df.drop('Loan_Status', axis=1)
y = df['Loan_Status']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

model = VotingClassifier(estimators=[
    ('lr', LogisticRegression(max_iter=1000)),
    ('dt', DecisionTreeClassifier()),
    ('rf', RandomForestClassifier())
], voting='hard')
model.fit(X_train, y_train)

# Input fields
col1, col2 = st.columns(2)

with col1:
    Gender = st.selectbox("Gender", ["Male", "Female"])
    Married = st.selectbox("Married", ["Yes", "No"])
    Dependents = st.selectbox("Dependents", ["0", "1", "2", "3+"])
    Education = st.selectbox("Education", ["Graduate", "Not Graduate"])
    Self_Employed = st.selectbox("Self Employed", ["Yes", "No"])

with col2:
    ApplicantIncome = st.number_input("Applicant Income", min_value=0)
    CoapplicantIncome = st.number_input("Coapplicant Income", min_value=0)
    LoanAmount = st.number_input("Loan Amount (in thousands)", min_value=0)
    Loan_Amount_Term = st.number_input("Loan Amount Term (in days)", min_value=0)
    Credit_History = st.selectbox("Credit History", ["Has Credit History", "No Credit History"])
    Property_Area = st.selectbox("Property Area", ["Urban", "Rural", "Semiurban"])

if st.button("🔍 Predict Loan Status"):
    gender_map = {"Male": 1, "Female": 0}
    married_map = {"Yes": 1, "No": 0}
    education_map = {"Graduate": 1, "Not Graduate": 0}
    self_employed_map = {"Yes": 1, "No": 0}
    credit_map = {"Has Credit History": 1, "No Credit History": 0}
    property_map = {"Rural": 0, "Semiurban": 1, "Urban": 2}
    dependents_map = {"0": 0, "1": 1, "2": 2, "3+": 3}

    features = [
        gender_map[Gender],
        married_map[Married],
        dependents_map[Dependents],
        education_map[Education],
        self_employed_map[Self_Employed],
        ApplicantIncome,
        CoapplicantIncome,
        LoanAmount,
        Loan_Amount_Term,
        credit_map[Credit_History],
        property_map[Property_Area]
    ]

    prediction = model.predict([features])
    result = "✅ Approved" if prediction[0] == 1 else "❌ Rejected"

    st.success(f"Loan Prediction Result: {result}")
    st.balloons()
