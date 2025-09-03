# Alumni Connect - MERN Stack Platform

## Overview

Alumni Connect is a comprehensive social networking platform built with the MERN stack (MongoDB, Express.js, React, Node.js) that connects students, teachers, and alumni. The platform facilitates networking, mentorship, event management, and content sharing within an educational community. It supports role-based access control with distinct features for students, teachers, alumni, and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture (Express.js/Node.js)
- **RESTful API Design**: Modular route structure with separate controllers for different domains (auth, users, posts, events, connections)
- **Authentication**: JWT-based authentication with cookie and Bearer token support, role-based middleware for access control
- **Database Layer**: Mongoose ODM for MongoDB interaction with schema definitions for Users, Posts, Events, Connections, and Notifications
- **Middleware Stack**: CORS, Helmet for security, rate limiting, Morgan for logging, custom error handling
- **File Upload System**: Multer integration for handling profile pictures and post media with local storage
- **Email Service**: Nodemailer integration for OTP verification and notifications
- **Socket.io Integration**: Real-time messaging and notification system

### Frontend Architecture (React)
- **Component-Based Structure**: Functional components with hooks, context-based state management
- **Routing**: React Router DOM with private route protection and role-based access
- **UI Framework**: Tailwind CSS for styling with custom animations and responsive design
- **State Management**: React Context API for authentication and notifications, React Query for server state
- **Form Handling**: React Hook Form for form validation and submission
- **Toast Notifications**: React Toastify for user feedback
- **Animation Library**: Framer Motion for smooth transitions and animations

### Database Design (MongoDB)
- **User Management**: Unified User schema supporting multiple roles (student, teacher, alumni, admin) with role-specific fields
- **Content System**: Post schema with media support, visibility controls, and engagement features (likes, comments)
- **Event Management**: Event schema with approval workflow, RSVP functionality, and audience targeting
- **Social Features**: Connection schema for managing follow/friendship requests and relationships
- **Notification System**: Comprehensive notification schema for real-time updates

### Authentication & Authorization
- **Multi-Factor Authentication**: Username/email login with OTP verification support
- **Role-Based Access Control**: Four distinct user roles with specific permissions and middleware protection
- **Session Management**: JWT tokens with configurable expiration and secure cookie storage
- **Password Security**: bcrypt hashing with strength validation requirements

### Real-Time Features
- **Live Messaging**: Socket.io implementation for direct messaging between connected users
- **Notification System**: Real-time push notifications for connections, events, and content interactions
- **Connection Status**: Live updates for connection requests and approvals

## External Dependencies

### Core Technologies
- **Database**: MongoDB with Mongoose ODM for data modeling and validation
- **Backend Framework**: Express.js with comprehensive middleware stack
- **Frontend Library**: React 18 with modern hooks and context patterns
- **Authentication**: JSON Web Tokens (jsonwebtoken) with bcrypt for password hashing

### UI/UX Libraries
- **Styling**: Tailwind CSS for utility-first responsive design
- **Icons**: React Icons library for consistent iconography
- **Animations**: Framer Motion for smooth component transitions
- **Forms**: React Hook Form for efficient form handling and validation
- **Notifications**: React Toastify for user feedback system

### Communication & Media
- **Email Service**: Nodemailer with configurable SMTP transporter (Mailtrap for development)
- **File Uploads**: Multer middleware for handling multipart form data and file storage
- **Real-Time Communication**: Socket.io for bidirectional client-server communication

### Development & Security
- **Security Headers**: Helmet.js for HTTP security headers
- **Rate Limiting**: Express rate limiter for API protection
- **CORS**: Configurable cross-origin resource sharing
- **Development Tools**: Nodemon for auto-reloading, Concurrently for running multiple processes
- **Testing Framework**: Jest for unit testing (configured but not extensively implemented)

### Data Processing
- **Date Handling**: date-fns for date formatting and manipulation
- **Network Visualization**: React Force Graph 2D for alumni network visualization
- **Validation**: Express Validator for request validation and sanitization