import React, { useEffect, useState } from "react";
import Chatbot from "./components/ui/Chatbot";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
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
import PublicProfilePage from "./pages/PublicProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./pages/SearchPage";
import PostsPage from "./pages/PostPage.jsx";
import AdminForumManager from "./admin/AdminForumManager.jsx";
import AdminForumAnalytics from "./admin/AdminForumAnalytics.jsx";
import AdminUserList from "./admin/AdminUserList.jsx";
import AdminEventList from "./admin/AdminEventList.jsx";
import AdminEventDetail from "./admin/AdminEventDetail.jsx";
import AdminPostsManager from "./admin/AdminPostsManager.jsx";
import AdminPostsAnalytics from "./admin/AdminPostsAnalytics.jsx";
import AdminReportsManager from "./admin/AdminReportsManager.jsx";
import { AvatarPreviewProvider } from "./components/ui/AvatarPreviewProvider";

function RouteAwareLayout({ children }) {
  const location = useLocation();
  const isMessagesRoute = location.pathname.startsWith("/messages");
  const isProfileRoute = location.pathname.startsWith("/profile");
  const isAdminRoute = location.pathname.startsWith("/admin");
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const showChatbot =
    !isAdminRoute && !isMessagesRoute && (!isProfileRoute || isDesktop);

  if (isAdminRoute) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-grow">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">{children}</main>
      {!isMessagesRoute && <Footer />}
      {showChatbot && <Chatbot />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AvatarPreviewProvider>
          <Router>
            <RouteAwareLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
                  path="/posts/saved"
                  element={
                    <PrivateRoute>
                      <PostsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/posts/:id"
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
                      <AdminForumAnalytics />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/forum/manage"
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
                <Route
                  path="/admin/posts"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminPostsAnalytics />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/posts/manage"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminPostsManager />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <AdminReportsManager />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <Navigate to="/profile?tab=settings" replace />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/network"
                  element={
                    <PrivateRoute roles={["admin"]}>
                      <NetworkPage />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </RouteAwareLayout>
          </Router>
        </AvatarPreviewProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
