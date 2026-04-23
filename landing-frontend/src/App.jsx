import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GuidePage   from './pages/GuidePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<LandingPage />} />
        <Route path="/guide" element={<GuidePage />} />
      </Routes>
    </BrowserRouter>
  );
}
