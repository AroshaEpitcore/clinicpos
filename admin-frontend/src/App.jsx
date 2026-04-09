import { Routes, Route } from 'react-router-dom';

// Pages (create these as you build Phase 4 — Super Admin Panel)
// import AdminLoginPage from './pages/AdminLoginPage';
// import AdminDashboard from './pages/AdminDashboard';
// import ClinicList from './pages/ClinicList';
// import ClinicDetail from './pages/ClinicDetail';
// import FeatureFlags from './pages/FeatureFlags';

function App() {
  return (
    <Routes>
      <Route path="/" element={<div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>ClinicPOS — Super Admin Panel</h1>
        <p>Project is set up. Build this in Phase 4 (after clinic-frontend and backend-api are done).</p>
      </div>} />
    </Routes>
  );
}

export default App;
