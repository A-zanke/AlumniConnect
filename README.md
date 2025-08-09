# Alumni Connect - MERN Stack Application

A full-stack alumni networking platform built with MongoDB, Express.js, React, and Node.js.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory with the following content:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/alumni-connect
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

4. Create uploads directory for profile pictures:
```bash
mkdir uploads
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm start
```

## MongoDB Setup

1. Download and install MongoDB Community Server from [MongoDB's official website](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:
   - Windows: MongoDB should start automatically as a service
   - Mac/Linux: Run `mongod` in terminal

3. Verify MongoDB is running:
```bash
mongosh
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Profile
- GET `/api/profile/:userId` - Get user profile
- PATCH `/api/profile` - Update user profile
- POST `/api/profile/upload-profile-picture` - Upload profile picture

### Connections
- GET `/api/connections` - Get user connections
- POST `/api/connections/:userId` - Send connection request
- PUT `/api/connections/:connectionId` - Accept/Reject connection request

## Environment Variables

- `PORT` - Backend server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `NODE_ENV` - Environment mode (development/production)

## Project Structure

```
alumni-connect/
├── backend/
│   ├── config/
│   │   └── db.js
│   │   └── middleware/
│   │   └── routes/
│   │   └── uploads/
│   │   └── package.json
│   │   └── server.js
│   └── models/
│       └── User.js
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └──
    │   ├── pages/
    │   └── App.js
    └── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 