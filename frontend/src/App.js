import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import NetworkPage from './pages/NetworkPage';
import MessagesPage from './pages/MessagesPage';
import ForumPage from './pages/ForumPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import SearchPage from './pages/SearchPage';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />
                <Route
                  path="/network"
                  element={
                    <PrivateRoute>
                      <NetworkPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <PrivateRoute>
                      <MessagesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/forum"
                  element={
                    <PrivateRoute>
                      <ForumPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile/:username"
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route path="/search" element={<SearchPage />} />
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminDashboardPage />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;