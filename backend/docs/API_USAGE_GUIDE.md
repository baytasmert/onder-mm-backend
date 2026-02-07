# 🎯 API USAGE GUIDE - ÖNDER DENETİM

**Quick Reference for Frontend Developers**

---

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Authentication Flow](#authentication-flow)
3. [Common Operations](#common-operations)
4. [Error Handling](#error-handling)
5. [Code Examples](#code-examples)
6. [Rate Limiting](#rate-limiting)

---

## Setup & Configuration

### Development Environment
```javascript
// .env.development
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_API_TIMEOUT=30000
```

### Production Environment
```javascript
// .env.production
VITE_API_BASE_URL=https://api.onderdenetim.com/api/v1
VITE_API_TIMEOUT=30000
```

### Axios Instance (Recommended)
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.VITE_API_BASE_URL,
  timeout: process.env.VITE_API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Authentication Flow

### 1. Sign In (Get Token)

**Endpoint:** `POST /auth/signin`
**Access:** Public
**Rate Limit:** 5 requests/15 minutes

**Request:**
```javascript
const response = await apiClient.post('/auth/signin', {
  email: 'mertbaytas@gmail.com',
  password: 'your-password'
});
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Successfully signed in",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6380ed0f-e2d1-4c49-adfd-1f1cee179f61",
      "email": "mertbaytas@gmail.com",
      "name": "Site Yöneticisi",
      "role": "admin"
    }
  }
}
```

**Store Token:**
```javascript
localStorage.setItem('authToken', response.data.data.token);
localStorage.setItem('user', JSON.stringify(response.data.data.user));
```

### 2. Check Auth Status
```javascript
const isAuthenticated = () => !!localStorage.getItem('authToken');
const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');
```

### 3. Logout
```javascript
const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
```

---

## Common Operations

### Blog Management

#### Get All Blog Posts
```javascript
// Public - No auth required
const posts = await apiClient.get('/blog', {
  params: {
    category: 'Muhasebe',
    limit: 10,
    offset: 0,
    search: 'KDV'
  }
});

console.log(posts.data.data.posts); // Array of posts
```

#### Get Single Blog Post
```javascript
const post = await apiClient.get(`/blog/${postId}`);
console.log(post.data.data);
```

#### Create Blog Post (Admin Only)
```javascript
const newPost = await apiClient.post('/blog', {
  title: 'KDV Rehberi 2026',
  content: '<p>KDV hakkında detaylar...</p>',
  category: 'Muhasebe',
  tags: ['KDV', 'Vergi'],
  status: 'published'
});

console.log(newPost.data.data.id);
```

#### Update Blog Post (Admin Only)
```javascript
const updated = await apiClient.put(`/blog/${postId}`, {
  title: 'Güncellenmiş Başlık',
  status: 'published'
});
```

#### Delete Blog Post (Admin Only)
```javascript
await apiClient.delete(`/blog/${postId}`);
```

### Contact Form

#### Submit Contact
```javascript
const response = await apiClient.post('/contact', {
  name: 'Ahmet Yılmaz',
  email: 'ahmet@example.com',
  phone: '+90 555 123 4567',
  company: 'XYZ Ltd. Şti.',
  subject: 'Vergiye Tabi İşlemler',
  message: 'Sorularım hakkında detaylar...',
  category: 'muhasebe' // muhasebe|denetim|danismanlik|genel
});

console.log(response.data.data.ticketId); // For tracking
```

#### Get All Messages (Admin)
```javascript
const messages = await apiClient.get('/contact', {
  params: {
    status: 'open', // open|in_progress|closed
    limit: 20,
    offset: 0,
    search: 'KDV'
  }
});
```

#### Update Message Status (Admin)
```javascript
await apiClient.put(`/contact/${messageId}`, {
  status: 'in_progress'
});
```

### Newsletter Subscribers

#### Subscribe to Newsletter
```javascript
const response = await apiClient.post('/subscribers', {
  email: 'user@example.com'
});

console.log(response.data.data.subscriptionToken); // For verification
```

#### Verify Subscription
```javascript
await apiClient.post('/subscribers/verify', {
  token: 'verification-token-from-email'
});
```

#### Unsubscribe
```javascript
await apiClient.post('/subscribers/unsubscribe', {
  email: 'user@example.com'
});
```

### Regulations

#### Get All Regulations
```javascript
const regulations = await apiClient.get('/regulations', {
  params: {
    category: 'Muhasebe',
    limit: 50
  }
});
```

#### Get by Category
```javascript
const byCategory = await apiClient.get('/regulations/category', {
  params: { category: 'Vergi' }
});
```

#### Create Regulation (Admin)
```javascript
const reg = await apiClient.post('/regulations', {
  title: 'Yeni Vergi Mevzuatı',
  content: 'Detaylar...',
  category: 'Vergi',
  effectiveDate: '2026-01-01',
  status: 'active'
});
```

### File Upload

#### Upload Image
```javascript
const formData = new FormData();
formData.append('file', imageFile); // File object from input

const response = await apiClient.post('/upload/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

console.log(response.data.data.url); // Image URL
```

#### Upload Document
```javascript
const formData = new FormData();
formData.append('file', docFile);

const response = await apiClient.post('/upload/file', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

console.log(response.data.data.url); // Document URL
```

#### Delete Upload
```javascript
await apiClient.delete(`/upload/${filename}`);
```

### Calculators

#### Get Available Calculators
```javascript
const calculators = await apiClient.get('/calculators');
// Returns: tax, salary, expense, etc.
```

#### Calculate Tax
```javascript
const result = await apiClient.post('/calculators/tax', {
  grossAmount: 10000,
  deductions: 500,
  year: 2026
});

console.log(result.data.data.taxAmount);
```

#### Calculate Salary
```javascript
const salary = await apiClient.post('/calculators/salary', {
  monthlyBaseSalary: 5000,
  deductions: 200
});
```

### Admin Panel

#### Get Dashboard Stats (Admin)
```javascript
const stats = await apiClient.get('/admin/dashboard');

console.log({
  totalUsers: stats.data.data.users.total,
  totalMessages: stats.data.data.contact.total,
  subscribers: stats.data.data.subscribers.total
});
```

#### Get System Health (Admin)
```javascript
const health = await apiClient.get('/system/health/detailed');

console.log({
  uptime: health.data.data.uptime,
  memory: health.data.data.memory.usagePercent,
  cpu: health.data.data.cpu
});
```

#### Trigger Backup (Admin)
```javascript
const backup = await apiClient.post('/admin/backup/create', {
  type: 'full'
});

console.log(backup.data.data.backupId);
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

### Handle Errors Properly
```javascript
try {
  const response = await apiClient.post('/blog', data);
  console.log('Success:', response.data.data);
} catch (error) {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        console.error('Validation Error:', data.error);
        break;
      case 401:
        console.error('Unauthorized - Please login');
        break;
      case 403:
        console.error('Forbidden - No permission');
        break;
      case 404:
        console.error('Not Found');
        break;
      case 429:
        console.error('Too many requests - Rate limited');
        break;
      case 500:
        console.error('Server error');
        break;
    }
  } else if (error.request) {
    // Request made but no response
    console.error('Network error');
  } else {
    console.error('Error:', error.message);
  }
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| VALIDATION_ERROR | Missing/invalid fields | Check request format |
| UNAUTHORIZED | No/invalid token | Re-login |
| FORBIDDEN | No permission | Check user role |
| NOT_FOUND | Resource doesn't exist | Verify ID/slug |
| RATE_LIMITED | Too many requests | Wait before retry |
| SERVER_ERROR | Internal error | Check server logs |

---

## Code Examples

### React Hook for Blog
```javascript
import { useState, useEffect } from 'react';
import apiClient from './api-client';

export const useBlogPosts = (category = null) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiClient.get('/blog', {
          params: { category, limit: 10 }
        });
        setPosts(response.data.data.posts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [category]);

  return { posts, loading, error };
};

// Usage
function BlogPage() {
  const { posts, loading, error } = useBlogPosts('Muhasebe');

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

### React Hook for Contact Form
```javascript
export const useContactForm = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (formData) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/contact', formData);
      setSubmitted(true);
      return response.data.data.ticketId;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, submitted };
};

// Usage
function ContactForm() {
  const { submit, loading, submitted } = useContactForm();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const ticketId = await submit(data);
    console.log('Ticket ID:', ticketId);
  };

  if (submitted) {
    return <div>Mesajınız başarıyla gönderildi!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Gönder'}
      </button>
    </form>
  );
}
```

### Vue 3 Composable for Admin
```javascript
import { ref } from 'vue';
import apiClient from './api-client';

export const useAdminDashboard = () => {
  const stats = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      stats.value = response.data.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return { stats, loading, error, fetchStats };
};

// Usage in Component
<template>
  <div v-if="loading">Yükleniyor...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else>
    <p>Toplam Mesaj: {{ stats.contact.total }}</p>
    <p>Abone: {{ stats.subscribers.total }}</p>
  </div>
</template>

<script setup>
import { useAdminDashboard } from './composables';
const { stats, loading, error } = useAdminDashboard();
</script>
```

---

## Rate Limiting

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/signin | 5 | 15 min |
| /contact | 3 | 1 hour |
| /subscribers | 10 | 1 day |
| /upload | 20 | 1 day |
| Other public | 100 | 1 hour |
| Admin | 1000 | 1 hour |

### Handle Rate Limiting
```javascript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after']; // seconds
  console.log(`Please wait ${retryAfter} seconds`);
  
  // Exponential backoff
  setTimeout(() => {
    // Retry request
  }, retryAfter * 1000);
}
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  },
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation error",
  "error": "Email is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-01-14T10:30:00.000Z"
}
```

---

## Best Practices

### 1. Always Use Try-Catch
```javascript
try {
  // API call
} catch (error) {
  // Handle error
}
```

### 2. Show Loading States
```javascript
const [loading, setLoading] = useState(false);
// Set to true before request, false after

<button disabled={loading}>
  {loading ? 'Processing...' : 'Submit'}
</button>
```

### 3. Implement Retry Logic
```javascript
const retryRequest = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

// Usage
const response = await retryRequest(() => apiClient.get('/blog'));
```

### 4. Cache Responses
```javascript
const cache = new Map();

const getCached = async (key, fetcher) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const data = await fetcher();
  cache.set(key, data);
  return data;
};

// Usage
const posts = await getCached('blog-posts', 
  () => apiClient.get('/blog')
);
```

### 5. Use Proper Headers
```javascript
// Set user agent
apiClient.defaults.headers['User-Agent'] = 'MyApp/1.0';

// Set custom headers for specific requests
await apiClient.get('/blog', {
  headers: { 'X-Custom-Header': 'value' }
});
```

---

## Testing

### Example Test (Jest)
```javascript
describe('Blog API', () => {
  it('should get all blog posts', async () => {
    const response = await apiClient.get('/blog');
    expect(response.status).toBe(200);
    expect(response.data.data.posts).toBeInstanceOf(Array);
  });

  it('should create blog post', async () => {
    const response = await apiClient.post('/blog', {
      title: 'Test',
      content: 'Content',
      category: 'Muhasebe'
    });
    expect(response.status).toBe(201);
    expect(response.data.data.id).toBeDefined();
  });
});
```

---

## Troubleshooting

### CORS Error
```
Error: Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution:** Check CORS whitelist in server.js - frontend URL must be added

### 401 Unauthorized
```
Error: Unauthorized
```
**Solution:** Token not included or expired - re-login required

### 404 Not Found
```
Error: Not Found
```
**Solution:** Check endpoint path and resource ID

### Network Timeout
```
Error: Timeout exceeded
```
**Solution:** Increase timeout in axios config or check network/server

---

**Last Updated:** 13 Ocak 2026  
**Version:** 1.0.0  
**Contact:** emir@onderdenetim.com
