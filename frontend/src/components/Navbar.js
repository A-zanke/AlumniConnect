import React from 'react';
import './Navbar.css';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="glass-navbar">
      <div className="navbar-logo" onClick={() => navigate('/')}>AlumniConnect</div>
      <ul className="navbar-links">
        <li><button onClick={() => navigate('/')}>Home</button></li>
        <li><button onClick={() => navigate('/events')}>Events</button></li>
        <li><button onClick={() => navigate('/profile')}>Profile</button></li>
        <li><button onClick={() => navigate('/login')}>Login</button></li>
        <li><button onClick={() => navigate('/register')}>Register</button></li>
      </ul>
    </nav>
  );
};

export default Navbar;
