import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_USER_SERVICE_URL || 'http://localhost:8080';

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_BASE}/api/users/validate`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.data.valid) {
            logout();
          }
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    validateToken();
  }, [token, API_BASE]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE}/api/users/login`, {
        username,
        password
      });
      
      const { token, username: user } = response.data;
      setToken(token);
      setUsername(user);
      localStorage.setItem('token', token);
      localStorage.setItem('username', user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post(`${API_BASE}/api/users/register`, {
        username,
        email,
        password
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await axios.post(`${API_BASE}/api/users/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const value = {
    token,
    username,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
