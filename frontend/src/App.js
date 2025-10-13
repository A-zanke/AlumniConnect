import React from "react";
import Chatbot from "./components/ui/Chatbot";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/layout/Navbar";
import MessagesPage from "./pages/MessagesPage";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AboutPage from "./pages/AboutPage.jsx";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import NetworkPage from "./pages/NetworkPage";
// import MessagesPage from "./pages/MessagesPage";
import ForumPage from "./pages/ForumPage";
import ForumPostPage from "./pages/ForumPostPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./pages/SearchPage";
import PostsPage from "./pages/PostsPage";
import AdminForumManager from "./admin/AdminForumManager.jsx";
import AdminUserList from "./admin/AdminUserList.jsx";
import AdminEventList from "./admin/AdminEventList.jsx";
import AdminEventDetail from "./admin/AdminEventDetail.jsx";

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
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailsPage />} />
                <Route path="/about" element={<AboutPage />} />
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
                    <PrivateRoute roles={["student", "admin"]}>
                      <ForumPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/forum/:id"
                  element={
                    <PrivateRoute roles={["student", "admin"]}>
                      <ForumPostPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/posts"
                  element={
                    <PrivateRoute>
                      <PostsPage />
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
                <Route
                  path="/profile/id/:userId"
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
                <Route
                  path="/admin/forum"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminForumManager />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminUserList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/events"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminEventList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/events/:id"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminEventDetail />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
            <Chatbot />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
