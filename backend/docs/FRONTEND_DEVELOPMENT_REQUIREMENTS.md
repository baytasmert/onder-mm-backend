# Frontend Development Requirements Report

**Report Date:** 2026-01-14  
**Backend Version:** 2.0.0  
**Status:** Backend Complete, Frontend Ready for Development

---

## 📌 BACKEND-ONLY ARCHITECTURE

**Important Notice:** This backend is designed as a pure API server with NO frontend code.

### What This Means:
- ✅ No React/Vue/Angular code in backend
- ✅ No frontend routing, components, or views
- ✅ No HTML/CSS bundling
- ✅ No SSR (Server-Side Rendering)
- ✅ Pure REST/JSON API
- ✅ CORS enabled for any frontend framework

---

## 🎯 Frontend Requirements

### For Your Frontend Development, You Need:

1. **Framework Choice** (any of these):
   - React (recommended)
   - Vue.js
   - Angular
   - Next.js
   - Svelte
   - Plain JavaScript

2. **Tooling**:
   - Bundler: Vite, Webpack, Parcel, or Next.js
   - Package Manager: npm, pnpm, or yarn
   - Build Tool: Any that can generate HTML/CSS/JS

3. **HTTP Client**:
   - Axios
   - Fetch API
   - SWR
   - React Query
   - TanStack Query

4. **Authentication**:
   - JWT token storage (localStorage/sessionStorage)
   - Token refresh logic
   - Protected routes

---

## 📡 API ENDPOINTS FOR FRONTEND

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://api.onderdenetim.com/api/v1
```

### Public Endpoints (No Auth Required)

#### Authentication
```
POST /auth/signin
Headers: Content-Type: application/json
Body: {
  email: string,
  password: string
}
Response: {
  token: string (JWT),
  user: {
    id: string,
    email: string,
    name: string,
    role: string
  }
}
```

#### Blog (Read-Only)
```
GET /blog
Query: ?category=Muhasebe&limit=10&offset=0

GET /blog/:id
```

#### Regulations (Read-Only)
```
GET /regulations
GET /regulations/:id
```

#### Contact Form
```
POST /contact
Body: {
  name: string,
  email: string,
  phone: string,
  subject: string,
  message: string
}
Response: {
  success: true,
  message: "Mesajınız başarıyla gönderildi"
}
```

#### Newsletter
```
POST /subscribe
Body: {
  email: string
}
Response: {
  success: true,
  message: "Subscription successful"
}

POST /unsubscribe
Body: {
  email: string
}
```

#### CSRF Token
```
GET /csrf-token
Response: {
  token: string
}
```

#### Health Check
```
GET /health
Response: {
  status: "ok",
  timestamp: ISO8601,
  uptime: number (milliseconds)
}
```

---

### Protected Endpoints (Require JWT Token)

**All protected requests must include:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Admin Dashboard
```
GET /admin/dashboard/stats
Response: {
  totalBlogPosts: number,
  totalContacts: number,
  totalSubscribers: number,
  blogByCategory: object,
  recentActivity: number
}
```

#### Admin Settings
```
GET /admin/settings
Response: {
  companyName: string,
  companyEmail: string,
  phone: string,
  address: string,
  timezone: string,
  language: string
}

PUT /admin/settings
Body: { companyName, companyEmail, phone, address, timezone, language }
```

#### User Management
```
GET /admin/users
Response: {
  users: [{
    id: string,
    email: string,
    name: string,
    role: string,
    status: string,
    lastLogin: ISO8601
  }],
  total: number
}

POST /admin/users
Body: {
  email: string,
  password: string,
  name: string,
  role: "admin|editor|viewer"
}

PUT /admin/users/:id
Body: { name, role, status }

DELETE /admin/users/:id

POST /admin/users/:id/change-password
Body: { newPassword: string }

POST /admin/users/:id/reset-password
```

#### Blog Management
```
POST /blog
Body: {
  title: string,
  content: string,
  category: string,
  tags: string[],
  featuredImage: string (URL or file)
}

PUT /blog/:id
Body: { title, content, category, tags, featuredImage }

DELETE /blog/:id
```

#### Logs
```
GET /admin/logs/list?type=login&limit=100&offset=0
Response: {
  logs: [{
    id: string,
    type: string,
    user: string,
    ip: string,
    timestamp: ISO8601,
    details: object
  }],
  total: number
}

DELETE /admin/logs/clear?type=login
```

#### Backups
```
POST /admin/backups/create
Response: {
  path: string,
  timestamp: ISO8601
}

GET /admin/backups/history
Response: {
  backups: [{ path, timestamp }],
  total: number
}
```

---

## 🔐 Authentication Flow

### 1. Login
```javascript
// Frontend
const response = await fetch('http://localhost:5000/api/v1/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'mertbaytas@gmail.com',
    password: 'eR4SmOusSe41.G1D3K'
  })
});

const { token, user } = await response.json();
localStorage.setItem('token', token);
```

### 2. Protected Request
```javascript
const response = await fetch('http://localhost:5000/api/v1/admin/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### 3. Token Refresh
```javascript
// If token expired (401 response), request new token
const newToken = await refreshToken();
localStorage.setItem('token', newToken);
```

---

## 📋 Default Test Credentials

```
Email: mertbaytas@gmail.com
Password: eR4SmOusSe41.G1D3K
Role: admin (has all permissions)
```

**For Testing Admin Endpoints:**
- ✅ Create new users
- ✅ Update settings
- ✅ View analytics
- ✅ Manage blog
- ✅ View logs

---

## 🚀 Frontend Setup Example (React)

### 1. Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── AdminDashboard.jsx
│   │   ├── LoginForm.jsx
│   │   ├── UserManagement.jsx
│   │   └── ...
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Admin.jsx
│   │   ├── Blog.jsx
│   │   └── ...
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useAdmin.js
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.jsx
│   └── App.jsx
├── .env
├── vite.config.js
└── package.json
```

### 2. API Service (src/services/api.js)
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  
  return response.json();
};

// Usage
export const getAdminStats = () => apiCall('/admin/dashboard/stats');
export const getUsers = () => apiCall('/admin/users');
export const createUser = (data) => apiCall('/admin/users', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### 3. Auth Context (src/context/AuthContext.jsx)
```javascript
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token on app load
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const { token, user } = await response.json();
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4. Protected Route
```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

---

## 🔄 CORS Configuration

Backend allows these origins for **development**:
```
http://localhost:3000
http://localhost:5173
http://127.0.0.1:3000
http://127.0.0.1:5173
```

For **production**, add your frontend domain:
```env
# Backend .env.production
ALLOWED_ORIGINS=https://onderdenetim.com,https://www.onderdenetim.com
```

---

## ⚠️ Common Frontend Issues & Solutions

### Issue 1: CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Ensure frontend URL in ALLOWED_ORIGINS
- Check request includes credentials: true
- Verify Authorization header format

### Issue 2: 401 Unauthorized
```
Response: { error: "Unauthorized" }
```
**Solution:**
- Check token is stored correctly
- Verify token format: `Bearer TOKEN`
- Token may have expired (ask for new one)

### Issue 3: 403 Forbidden
```
Response: { error: "Forbidden - Admin access required" }
```
**Solution:**
- User doesn't have required role
- Admin endpoints require role: "admin" or "super_admin"
- Check user role in AuthContext

### Issue 4: Network Timeout
```
Failed to fetch
```
**Solution:**
- Verify backend is running: `npm start`
- Check API_URL is correct
- Verify backend port is 5000
- Check firewall isn't blocking connection

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "status": "success",
  "data": { ... },
  "message": "Operation completed"
}
```

### Error Response
```json
{
  "success": false,
  "status": "error",
  "error": "Error message",
  "message": "Human-readable message",
  "details": { ... }
}
```

### Validation Error
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 🧪 Testing Checklist

### Before Frontend Launch

#### Authentication
- [ ] Login with correct credentials works
- [ ] Login with wrong password returns 401
- [ ] Token is stored in localStorage
- [ ] Token is sent in Authorization header

#### Public APIs
- [ ] Blog GET endpoint returns posts
- [ ] Contact form POST works
- [ ] Newsletter subscription works
- [ ] Health check responds

#### Protected APIs
- [ ] Admin endpoints require token
- [ ] Wrong token returns 401
- [ ] User can't access admin with viewer role
- [ ] Admin can access all endpoints

#### Error Handling
- [ ] 404 errors handled gracefully
- [ ] 500 errors show user-friendly message
- [ ] Network timeouts display retry button
- [ ] Invalid JSON responses handled

---

## 📚 Documentation for Frontend Team

**Required Documents:**
1. ✅ [API Reference](./API_REFERENCE_COMPLETE.md)
2. ✅ [Authentication Flow](./BACKEND_OVERVIEW.md)
3. ✅ [Security Audit](./SECURITY_AUDIT_DETAILED.md)
4. ✅ [Error Codes & Handling](./TROUBLESHOOTING.md)

---

## 🎯 Frontend Development Phases

### Phase 1: Setup & Authentication (1-2 days)
- [ ] Create React app
- [ ] Set up routing
- [ ] Implement login page
- [ ] Create auth context
- [ ] Test authentication

### Phase 2: Public Pages (2-3 days)
- [ ] Homepage
- [ ] Blog listing & detail
- [ ] Regulations page
- [ ] Contact form
- [ ] Newsletter subscription

### Phase 3: Admin Dashboard (3-4 days)
- [ ] Dashboard overview
- [ ] User management
- [ ] Content management
- [ ] Settings page
- [ ] Logs viewer

### Phase 4: Testing & Deployment (2 days)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security review
- [ ] Deploy to staging
- [ ] Deploy to production

---

## 💬 Questions?

**Backend Team** is available for:
- API implementation questions
- Authentication issues
- Performance optimization
- Security concerns
- Database queries

**Contact:** Backend Team via Slack/Email

---

**Prepared by:** Backend Development Team  
**Last Updated:** 2026-01-14  
**Version:** 1.0

