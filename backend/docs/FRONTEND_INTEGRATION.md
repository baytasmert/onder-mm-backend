# Frontend-Backend Integration Guide

**Updated:** January 14, 2026  
**Status:** Backend Ready, Frontend Integration Needed  

---

## API Configuration

### Frontend Config Update Required

**File:** `frontend/src/config/api.ts` (or similar)

```typescript
// ❌ CURRENT (needs fix)
const API_BASE = 'http://localhost:5000/api/v1';

// ✅ CORRECT (for Supabase)
const API_BASE = 'https://bfugfnhmdssusxabusbb.supabase.co/functions/v1/make-server-a678b39a';

// ✅ FOR LOCAL DEVELOPMENT
const API_BASE = 'http://localhost:5000/api/v1';
```

---

## Public Endpoints (No Token Required)

### 1. Health Check
```bash
GET /health
GET /api/v1/health
GET /api/v1/performance/health

Response:
{
  "success": true,
  "status": "healthy",
  "uptime": 3600,
  "memory": { "usagePercent": "35%" }
}
```

### 2. Authentication
```bash
POST /api/v1/auth/signin

Body:
{
  "email": "mertbaytas@gmail.com",
  "password": "eR4SmOusSe41.G1D3K"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "mertbaytas@gmail.com",
      "role": "admin",
      "name": "Site Yöneticisi"
    }
  }
}
```

### 3. Get CSRF Token
```bash
GET /api/v1/csrf-token

Response:
{
  "token": "csrf-token-value"
}
```

### 4. Blog (Read-only)
```bash
GET /api/v1/blog
GET /api/v1/blog/:id

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Blog Title",
      "content": "...",
      "slug": "blog-title",
      "published": true,
      "createdAt": "2026-01-14T..."
    }
  ]
}
```

### 5. Regulations (Read-only)
```bash
GET /api/v1/regulations
GET /api/v1/regulations/:id
GET /api/v1/regulations/category/:category

Response: Similar to blog
```

### 6. Newsletter Subscription
```bash
POST /api/v1/subscribe

Body:
{
  "email": "subscriber@example.com",
  "name": "Subscriber Name"
}

Response:
{
  "success": true,
  "message": "Subscribed successfully"
}
```

### 7. Contact Form
```bash
POST /api/v1/contact

Body:
{
  "name": "Name",
  "email": "email@example.com",
  "subject": "Subject",
  "message": "Message"
}

Response:
{
  "success": true,
  "data": { "id": "uuid", "status": "open" }
}
```

---

## Protected Endpoints (JWT Token Required)

### Header Format
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### 1. Admin Management

**List All Admins**
```bash
GET /api/v1/admin/users

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "mertbaytas@gmail.com",
      "name": "Site Yöneticisi",
      "role": "admin",
      "status": "active",
      "emailVerified": true,
      "permissions": ["blog:read", "blog:write", "email:send", "admin:read"],
      "createdAt": "2026-01-03T..."
    }
  ]
}
```

**Get Single Admin**
```bash
GET /api/v1/admin/users/:id

Response: Single admin object
```

**Create New Admin**
```bash
POST /api/v1/admin/users

Body:
{
  "email": "newadmin@example.com",
  "password": "SecurePassword123",
  "name": "New Admin",
  "role": "admin",
  "permissions": ["blog:read", "blog:write"]
}

Response:
{
  "success": true,
  "data": { "id": "uuid", "email": "..." }
}
```

**Update Admin**
```bash
PUT /api/v1/admin/users/:id

Body:
{
  "name": "Updated Name",
  "role": "editor",
  "permissions": [...]
}

Response: Updated admin object
```

**Change Password**
```bash
PUT /api/v1/admin/users/:id/password

Body:
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}

Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Delete Admin**
```bash
DELETE /api/v1/admin/users/:id

Response:
{
  "success": true,
  "message": "Admin deleted successfully"
}
```

### 2. Blog Management

**Create Blog Post**
```bash
POST /api/v1/blog

Body:
{
  "title": "Blog Title",
  "content": "<p>HTML Content</p>",
  "slug": "blog-title",
  "category": "technology",
  "featured": false,
  "published": true
}

Response: New blog post
```

**Update Blog Post**
```bash
PUT /api/v1/blog/:id

Body: Same as create

Response: Updated blog post
```

**Delete Blog Post**
```bash
DELETE /api/v1/blog/:id

Response:
{
  "success": true,
  "message": "Blog deleted"
}
```

### 3. Email Campaigns

**Send Test Email**
```bash
POST /api/v1/email/send-test

Body:
{
  "email": "test@example.com",
  "subject": "Test Email",
  "template": "welcome"
}

Response:
{
  "success": true,
  "message": "Test email sent successfully"
}
```

**Send Newsletter**
```bash
POST /api/v1/email/send-newsletter

Body:
{
  "subject": "Newsletter Title",
  "content": "<p>HTML Content</p>",
  "target": "all" // or "verified", "unverified"
}

Response:
{
  "success": true,
  "data": { 
    "recipientCount": 150,
    "campaignId": "uuid"
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Common Status Codes
- **200** - Success
- **400** - Bad Request
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **429** - Too Many Requests (rate limited)
- **500** - Server Error

---

## Frontend Implementation

### 1. Setup API Client

```typescript
// api.ts
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export const api = {
  get: async (path, token?) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}${path}`, { headers });
    return res.json();
  },

  post: async (path, data, token?) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
```

### 2. Login Implementation

```typescript
const handleLogin = async (email, password) => {
  try {
    const result = await api.post('/auth/signin', { email, password });
    if (result.success) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      // Redirect to dashboard
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 3. Admin Management

```typescript
// Fetch admins
const fetchAdmins = async (token) => {
  const result = await api.get('/admin/users', token);
  return result.data;
};

// Create admin
const createAdmin = async (adminData, token) => {
  const result = await api.post('/admin/users', adminData, token);
  return result.data;
};

// Update admin
const updateAdmin = async (id, data, token) => {
  const result = await api.put(`/admin/users/${id}`, data, token);
  return result.data;
};
```

---

## Permission System

### Available Permissions
- `blog:read`, `blog:write`, `blog:delete`
- `regulations:read`, `regulations:write`, `regulations:delete`
- `email:send`, `email:manage`
- `admin:read`, `admin:write`, `admin:delete`
- `subscribers:read`, `subscribers:export`
- `analytics:read`
- `settings:manage`

### Roles
- **super_admin** - All permissions
- **admin** - Most permissions
- **editor** - Content editing
- **viewer** - Read-only access

---

## Frontend Checklist

- [ ] Update API_BASE URL in config
- [ ] Fix 401 health check error (public route)
- [ ] Implement login with correct endpoint
- [ ] Store JWT token in localStorage
- [ ] Add Authorization header to protected requests
- [ ] Create admin management UI
- [ ] Create blog management UI
- [ ] Create email campaign UI
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Test all endpoints
- [ ] Deploy to production

---

## Testing

### Manual Tests

1. **Health Check**
```bash
curl http://localhost:5000/api/v1/health
```

2. **Login**
```bash
curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mertbaytas@gmail.com",
    "password": "eR4SmOusSe41.G1D3K"
  }'
```

3. **List Admins** (with token)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/admin/users
```

---

## Deployment

### Environment Variables

**Frontend (.env)**
```
REACT_APP_API_URL=https://api.onderdenetim.com
REACT_APP_ENV=production
```

**Backend (.env.production)**
```
NODE_ENV=production
API_URL=https://api.onderdenetim.com
ALLOWED_ORIGINS=https://onderdenetim.com
```

---

**Ready to integrate! 🚀**
