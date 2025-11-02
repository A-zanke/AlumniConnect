import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FiHome,
  FiMessageCircle,
  FiMessageSquare,
  FiCalendar,
  FiFileText,
  FiLogIn,
  FiUserPlus,
  FiUser,
} from "react-icons/fi";
import { getAvatarUrl } from "../utils/helpers";
import "./MobileBottomNav.css";

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = (user?.role || "").toLowerCase();

  const navItems = useMemo(() => {
    if (!user) {
      return [
        {
          key: "home",
          to: "/",
          label: "Home",
          icon: FiHome,
        },
        {
          key: "events",
          to: "/events",
          label: "Events",
          icon: FiCalendar,
        },
        {
          key: "posts",
          to: "/posts",
          label: "Posts",
          icon: FiFileText,
        },
        {
          key: "login",
          to: "/login",
          label: "Login",
          icon: FiLogIn,
        },
        {
          key: "register",
          to: "/register",
          label: "Register",
          icon: FiUserPlus,
        },
      ];
    }

    const items = [];

    const profileItem = {
      key: "profile",
      to: "/profile",
      label: "Profile",
      type: "avatar",
    };

    if (role === "student") {
      items.push(
        { key: "home", to: "/", label: "Home", icon: FiHome },
        { key: "forum", to: "/forum", label: "Forum", icon: FiMessageCircle },
        { key: "events", to: "/events", label: "Events", icon: FiCalendar },
        { key: "posts", to: "/posts", label: "Posts", icon: FiFileText },
        profileItem
      );
      return items;
    }

    items.push(
      { key: "home", to: "/", label: "Home", icon: FiHome },
      { key: "events", to: "/events", label: "Events", icon: FiCalendar },
      { key: "posts", to: "/posts", label: "Posts", icon: FiFileText },
      { key: "messages", to: "/messages", label: "Messages", icon: FiMessageSquare },
      profileItem
    );

    return items;
  }, [role, user]);

  const hideNav = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/admin")) return true;
    if (path.startsWith("/login") || path.startsWith("/register")) return true;
    return false;
  }, [location.pathname]);

  if (hideNav) {
    return null;
  }

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-bottom-nav__inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "mobile-bottom-nav__item",
                  isActive ? "is-active" : "",
                  item.type === "avatar" ? "mobile-bottom-nav__item--avatar" : "",
                ].join(" ").trim()
              }
            >
              {item.type === "avatar" ? (
                <span className="mobile-bottom-nav__avatar">
                  {user?.avatarUrl ? (
                    <img
                      src={getAvatarUrl(user.avatarUrl)}
                      alt="Profile"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/default-avatar.png";
                      }}
                    />
                  ) : (
                    <FiUser size={20} />
                  )}
                </span>
              ) : (
                <span className="mobile-bottom-nav__icon">
                  <Icon size={22} />
                </span>
              )}
              <span className="mobile-bottom-nav__sr-only">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
