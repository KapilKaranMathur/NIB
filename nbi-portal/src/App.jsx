import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ResearcherDashboard from './pages/ResearcherDashboard.jsx';
import ExperimentRunner from './pages/ExperimentRunner.jsx';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ResearcherDashboard />} />
        <Route path="/experiment/:sessionId" element={<ExperimentRunner />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
