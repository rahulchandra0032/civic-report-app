import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IssueList from './pages/IssueList';
import IssueMap from './pages/IssueMap';
import SLAReport from './pages/SLAReport';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-bold text-blue-700">🏛️ Civic Admin</h1>
                <a href="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium">Dashboard</a>
                <a href="/issues" className="text-gray-600 hover:text-blue-600 font-medium">Issues</a>
                <a href="/map" className="text-gray-600 hover:text-blue-600 font-medium">Map</a>
                <a href="/sla" className="text-gray-600 hover:text-blue-600 font-medium">SLA</a>
              </div>
              <div className="flex items-center">
                <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-medium">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/issues" element={<IssueList />} />
            <Route path="/map" element={<IssueMap />} />
            <Route path="/sla" element={<SLAReport />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
