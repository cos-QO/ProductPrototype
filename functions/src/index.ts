import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';

const app = express();

// CORS configuration for Firebase hosting
app.use(cors({
  origin: ['https://skustore.web.app', 'https://skustore.firebaseapp.com', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple auth routes for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // For now, just simulate successful login
  const mockUser = {
    id: 'firebase-user-123',
    email: email,
    firstName: 'Firebase',
    lastName: 'User',
    role: 'brand_owner'
  };

  res.json({ 
    message: "Login successful", 
    user: mockUser 
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: "Logout successful" });
});

app.get('/api/auth/me', (req, res) => {
  const mockUser = {
    id: 'firebase-user-123',
    email: 'user@example.com',
    firstName: 'Firebase',
    lastName: 'User',
    role: 'brand_owner'
  };
  
  res.json({ user: mockUser });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'firebase-functions'
  });
});

// Health check at root for testing
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'firebase-functions'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method 
  });
});

// Export the Firebase Function
export const api = onRequest({
  region: 'us-central1',
  memory: '512MiB',
  timeoutSeconds: 60,
  maxInstances: 10
}, app);