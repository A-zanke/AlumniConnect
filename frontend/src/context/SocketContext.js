import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        // Join role room
        newSocket.emit('joinRoom', user.role);
        // Join department-year room for students
        if (user.role === 'student' && user.department && user.year) {
          newSocket.emit('joinSectionRoom', { department: user.department, year: user.year });
        }
        // Join department room for teachers
        if (user.role === 'teacher' && user.department) {
          newSocket.emit('joinTeacherRoom', { department: user.department });
        }
        // Join department-graduationYear room for alumni
        if (user.role === 'alumni' && user.department && user.graduationYear) {
          newSocket.emit('joinAlumniRoom', { department: user.department, graduationYear: user.graduationYear });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [user, token]);

  const value = {
    socket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
