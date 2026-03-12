import React from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/apiService';

const ProtectedRoute = ({ children }) => {
  // Check authentication using existing apiService methods
  const isAuthenticated = apiService.isAuthenticated();
  const token = apiService.getToken();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;


