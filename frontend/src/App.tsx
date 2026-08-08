import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GoalDetailPage } from './pages/GoalDetailPage'
import { GoalFormPage } from './pages/GoalFormPage'
import { GoalsPage } from './pages/GoalsPage'
import { TrackerPage } from './pages/TrackerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TrackerPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/new" element={<GoalFormPage />} />
        <Route path="/goals/:id" element={<GoalDetailPage />} />
        <Route path="/goals/:id/edit" element={<GoalFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
