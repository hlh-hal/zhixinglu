/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import SettingsLayout from './components/SettingsLayout';
import DailyLog from './pages/DailyLog';
import MonthlyReview from './pages/MonthlyReview';
import HalfYearReview from './pages/HalfYearReview';
import CommunityChallenges from './pages/CommunityChallenges';
import CommunityChallengesAll from './pages/CommunityChallengesAll';
import CommunityFriends from './pages/CommunityFriends';
import CommunityAchievements from './pages/CommunityAchievements';
import CommunityLeaderboard from './pages/CommunityLeaderboard';
import Dashboard from './pages/Dashboard';
import DataManagement from './pages/settings/DataManagement';
import Profile from './pages/settings/Profile';
import Security from './pages/settings/Security';
import Notifications from './pages/settings/Notifications';
import About from './pages/settings/About';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './pages/admin/AdminLayout';
import AdminChallenges from './pages/admin/AdminChallenges';
import AdminBadges from './pages/admin/AdminBadges';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-surface"><div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/daily" replace />} />
            <Route path="daily" element={<DailyLog />} />
            <Route path="monthly" element={<MonthlyReview />} />
            <Route path="half-year" element={<HalfYearReview />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="community">
              <Route index element={<Navigate to="/community/challenges" replace />} />
              <Route path="challenges" element={<CommunityChallenges />} />
              <Route path="challenges/all" element={<CommunityChallengesAll />} />
              <Route path="friends" element={<CommunityFriends />} />
              <Route path="achievements" element={<CommunityAchievements />} />
              <Route path="leaderboard" element={<CommunityLeaderboard />} />
            </Route>
          </Route>
          <Route path="/settings" element={<PrivateRoute><SettingsLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/settings/data" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="security" element={<Security />} />
            <Route path="data" element={<DataManagement />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/admin/challenges" replace />} />
            <Route path="challenges" element={<AdminChallenges />} />
            <Route path="badges" element={<AdminBadges />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
