import './App.css'
import ModelInfo from './components/ModelInfo'
import LoanForm from './components/LoanForm'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Loan Approval Prediction</h1>
        <ModelInfo />
      </header>
      <main>
        <LoanForm />
      </main>
    </div>
  )
}

export default App
