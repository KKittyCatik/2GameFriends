import { Link, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { NewSessionPage } from './pages/NewSessionPage'
import { SessionPage } from './pages/SessionPage'
import { SummaryPage } from './pages/SummaryPage'

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">Poker Friends</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewSessionPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/session/:id/summary" element={<SummaryPage />} />
        </Routes>
      </main>
    </div>
  )
}
