import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Login from './pages/Login';
import CommandDashboard from './pages/CommandDashboard';
import StationLeader from './pages/StationLeader';
import EmergencyIncidents from './pages/EmergencyIncidents';
import CargoLog from './pages/CargoLog';
import Inventory from './pages/Inventory';
import Personnel from './pages/Personnel';
import Assets from './pages/Assets';
import PolarMap from './pages/PolarMap';
import WeatherRisk from './pages/WeatherRisk';
import SyncConflicts from './pages/SyncConflicts';
import AuditLog from './pages/AuditLog';
import AdminSettings from './pages/AdminSettings';

function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex">
                <Sidebar />
                <div className="pl-64 flex-1">
                  <Header />
                  <Routes>
                    <Route path="/dashboard" element={<CommandDashboard />} />
                    <Route path="/station-leader" element={<StationLeader />} />
                    <Route path="/emergency" element={<EmergencyIncidents />} />
                    <Route path="/cargo-log" element={<CargoLog />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/personnel" element={<Personnel />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/polar-map" element={<PolarMap />} />
                    <Route path="/weather-risk" element={<WeatherRisk />} />
                    <Route path="/sync-conflicts" element={<SyncConflicts />} />
                    <Route path="/audit-log" element={<AuditLog />} />
                    <Route path="/admin-settings" element={<AdminSettings />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                  <Footer />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
