# AlumniConnect

A comprehensive platform connecting students, teachers, and alumni for MIT Academy of Engineering. Built to foster community engagement, facilitate networking, and streamline campus event management.

## Overview

AlumniConnect serves as the central hub for the MIT Academy community, enabling seamless communication between current students, faculty, and alumni. The platform offers real-time messaging, event management, forum discussions, and professional networking capabilities.

## Key Features

### For Students
- Browse and register for campus events
- Connect with alumni for mentorship and career guidance
- Participate in forum discussions
- Share and discover posts from the community
- Real-time messaging with peers and alumni

### For Alumni
- Stay connected with alma mater
- Mentor current students
- Share career opportunities and insights
- Organize alumni meetups and events
- Network with fellow graduates

### For Teachers
- Manage course-related events
- Engage with students and alumni
- Share educational content
- Moderate forum discussions

### For Administrators
- Comprehensive admin dashboard with analytics
- User management and role assignment
- Event approval and moderation
- Content management for posts and forums
- System-wide reporting and monitoring

## Tech Stack

**Frontend:**
- React 18 with React Router
- Tailwind CSS for styling
- Framer Motion for animations
- Recharts for data visualization
- Socket.IO client for real-time features
- Axios for API communication

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for WebSocket connections
- JWT for authentication
- Nodemailer for email services
- Node-forge for encryption

**Security:**
- End-to-end message encryption (RSA + AES)
- JWT-based authentication
- Role-based access control
- Input validation and sanitization

## Getting Started

### Prerequisites

Make sure you have the following installed:
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/AlumniConnect.git
cd AlumniConnect
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:

Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/alumniconnect
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (Brevo/Sendinblue)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_key
FROM_EMAIL=your_email@example.com
FROM_NAME=AlumniConnect

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Create a `.env` file in the `frontend` directory:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

5. Start MongoDB:
```bash
mongod
```

6. Start the backend server:
```bash
cd backend
npm start
```

7. Start the frontend development server:
```bash
cd frontend
npm start
```

The application should now be running at `http://localhost:3000`

## Project Structure

```
AlumniConnect/
├── backend/
│   ├── controllers/      # Request handlers
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── server.js        # Entry point
│
├── frontend/
│   ├── public/          # Static files
│   └── src/
│       ├── components/  # Reusable components
│       ├── pages/       # Page components
│       ├── admin/       # Admin panel components
│       ├── context/     # React context providers
│       ├── services/    # API services
│       └── App.js       # Main app component
│
└── README.md
```

## User Roles

The platform supports four distinct user roles:

1. **Student** - Current students of MIT Academy
2. **Teacher** - Faculty members
3. **Alumni** - Graduated students
4. **Admin** - System administrators

Each role has specific permissions and access levels throughout the application.

## Core Functionality

### Authentication
- Email-based registration with OTP verification
- Secure login with JWT tokens
- Password reset via email
- Role-based access control

### Messaging
- Real-time one-on-one messaging
- End-to-end encryption for privacy
- Message status indicators (sent, delivered, read)
- File attachments support
- Message search and filtering

### Events
- Create and manage events
- RSVP functionality
- Event categories and filtering
- Admin approval workflow
- Calendar integration

### Forum
- Topic-based discussions
- Threaded conversations
- Category organization
- Moderation tools
- Search functionality

### Posts
- Share updates and announcements
- Rich text formatting
- Image attachments
- Like and comment features
- Content moderation

### Networking
- Connect with other users
- View user profiles
- Filter by role, department, graduation year
- Connection requests and approvals

## Admin Dashboard

The admin panel provides comprehensive tools for platform management:

- **Analytics** - User growth, engagement metrics, event statistics
- **User Management** - View, edit, and manage user accounts
- **Event Management** - Approve, reject, or delete events
- **Content Moderation** - Review and moderate posts and forum content
- **Reports** - Handle user reports and flagged content
- **System Settings** - Configure platform-wide settings

## API Documentation

The backend exposes RESTful APIs for all major features:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/profile` - Get user profile

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Messages
- `GET /api/messages` - Get conversations
- `POST /api/messages` - Send message
- `GET /api/messages/:userId` - Get conversation with user
- `PUT /api/messages/:id/read` - Mark as read

(Additional endpoints available for posts, forum, connections, and admin operations)

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## Testing

Run the test suite:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Deployment

### Backend Deployment

1. Set up a MongoDB instance (MongoDB Atlas recommended)
2. Configure environment variables on your hosting platform
3. Deploy to services like Heroku, Railway, or DigitalOcean
4. Ensure WebSocket support is enabled

### Frontend Deployment

1. Build the production bundle:
```bash
cd frontend
npm run build
```

2. Deploy the `build` folder to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Any static hosting service

3. Update environment variables with production URLs

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access if using MongoDB Atlas

**SMTP Authentication Failed**
- Verify SMTP credentials in `.env`
- Check if SMTP service is active
- Ensure correct SMTP host and port

**WebSocket Connection Issues**
- Verify CORS settings in backend
- Check firewall rules
- Ensure Socket.IO versions match

**Messages Not Encrypting**
- Check if users have RSA key pairs generated
- Verify encryption service is working
- Check browser console for errors

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MIT Academy of Engineering for project support
- All contributors who have helped improve the platform
- Open source libraries that made this project possible

## Contact

For questions, suggestions, or issues:
- Email: support@alumniconnect.edu
- GitHub Issues: [Create an issue](https://github.com/yourusername/AlumniConnect/issues)

## Roadmap

Upcoming features:
- [ ] Mobile applications (iOS/Android)
- [ ] Video calling integration
- [ ] Job board for alumni
- [ ] Advanced analytics dashboard
- [ ] Integration with LinkedIn
- [ ] Newsletter system
- [ ] Event live streaming
- [ ] Mentorship matching algorithm

---

Built with ❤️ by the MIT Academy development team
