# 📡 ÖNDER DENETİM API - COMPLETE REFERENCE

**Base URL:** `http://localhost:5000` (Development)
**Production URL:** `https://api.onderdenetim.com`

**Current Version:** v1
**Last Updated:** 13 Ocak 2026
**Contact:** emir@onderdenetim.com

---

## 📚 TABLE OF CONTENTS

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Versioning](#api-versioning)
4. [Security](#security)
5. [Rate Limiting](#rate-limiting)
6. [Blog Management](#blog-management)
7. [Regulations](#regulations)
8. [Subscribers & Newsletter](#subscribers--newsletter)
9. [Contact Form](#contact-form)
10. [Social Media](#social-media)
11. [Email Campaigns](#email-campaigns)
12. [File Upload](#file-upload)
13. [Calculators](#calculators-mali-müşavirlik-tools)
14. [Analytics & Monitoring](#analytics--monitoring)
15. [System & Health](#system--health)
16. [Error Codes](#error-codes)

---

## 🚀 GETTING STARTED

### Base URL

All API requests should be made to:
```
http://localhost:5000/api/v1  (Development)
https://api.onderdenetim.com/api/v1  (Production)
```

**Important:** All endpoints require the `/api/v1` prefix. Direct access without the prefix is not supported.

### Request Format

All requests must use JSON format:
```http
Content-Type: application/json
```

### Authentication

Protected endpoints require JWT token:
```http
Authorization: Bearer <your-jwt-token>
```

### API Versioning

**All requests must include the `/api/v1` prefix:**
```
GET /api/v1/blog
POST /api/v1/auth/signin
GET /api/v1/calculators/tax-calendar
POST /api/v1/contact
```

API version can also be specified via header or query parameter:

1. **URL Prefix** (Required & Recommended)
```
GET /api/v1/blog
```

2. **Header** (Optional)
```
X-API-Version: v1
```

3. **Query Parameter** (Optional)
```
GET /api/v1/blog?version=v1
```

**Note:** Legacy direct access (without /api/v1 prefix) has been removed for security and consistency.

---

## 🔐 AUTHENTICATION

### POST /auth/signin

Sign in and obtain JWT token.

**Access:** Public
**Rate Limit:** 5 requests/15 minutes

**Request:**
```json
{
  "email": "admin@onderdenetim.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@onderdenetim.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Missing email or password
- `429` - Too many login attempts

---

### POST /auth/signup-admin

Create new admin account.

**Access:** Public (Should be protected in production)

**Request:**
```json
{
  "email": "newadmin@onderdenetim.com",
  "password": "SecurePassword123!",
  "name": "New Admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "new-user-id",
    "email": "newadmin@onderdenetim.com"
  }
}
```

---

### POST /auth/session

Validate existing JWT token.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user-id",
    "email": "admin@onderdenetim.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

---

## 📖 BLOG MANAGEMENT

### GET /blog

Get all blog posts with pagination and filtering.

**Access:** Public
**Cache:** 60 seconds

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `status` | string | - | Filter by status (draft, published, scheduled) |
| `category` | string | - | Filter by category |
| `search` | string | - | Search in title/content |
| `featured` | boolean | - | Filter featured posts |

**Example:**
```
GET /blog?page=1&limit=10&status=published&category=vergi
```

**Response (200):**
```json
{
  "posts": [
    {
      "id": "post-id",
      "title": "2026 Vergi Değişiklikleri",
      "slug": "2026-vergi-degisiklikleri",
      "excerpt": "2026 yılında yürürlüğe girecek vergi değişiklikleri...",
      "content": "Full content...",
      "author": {
        "id": "author-id",
        "name": "Admin"
      },
      "category": "vergi",
      "tags": ["vergi", "2026"],
      "featured_image": "/uploads/image.jpg",
      "status": "published",
      "featured": false,
      "views": 150,
      "reading_time": {
        "minutes": 5,
        "words": 1000,
        "text": "5 dakikalık okuma"
      },
      "seo": {
        "meta_title": "2026 Vergi Değişiklikleri",
        "meta_description": "...",
        "meta_keywords": ["vergi", "2026"],
        "og_image": "/uploads/image.jpg",
        "canonical_url": "/blog/2026-vergi-degisiklikleri"
      },
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-13T00:00:00.000Z",
      "published_at": "2026-01-05T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "per_page": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### GET /blog/:slug

Get single blog post by slug.

**Access:** Public

**Example:**
```
GET /blog/2026-vergi-degisiklikleri
```

**Response (200):**
```json
{
  "post": {
    "id": "post-id",
    "title": "2026 Vergi Değişiklikleri",
    "slug": "2026-vergi-degisiklikleri",
    "content": "Full blog post content...",
    ...
  }
}
```

**Errors:**
- `404` - Blog post not found

---

### POST /blog

Create new blog post.

**Access:** Admin only
**CSRF:** Required

**Request:**
```json
{
  "title": "New Blog Post",
  "content": "Full blog post content...",
  "excerpt": "Short excerpt (optional)",
  "category": "vergi",
  "tags": ["vergi", "2026"],
  "featured_image": "/uploads/image.jpg",
  "status": "published",
  "featured": false,
  "seo": {
    "meta_title": "Custom SEO title (optional)",
    "meta_description": "Custom description (optional)",
    "meta_keywords": ["keyword1", "keyword2"]
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "post": {
    "id": "new-post-id",
    "title": "New Blog Post",
    "slug": "new-blog-post",
    ...
  }
}
```

---

### PUT /blog/:id

Update existing blog post.

**Access:** Admin only
**CSRF:** Required

**Request:** (All fields optional)
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "draft"
}
```

**Response (200):**
```json
{
  "success": true,
  "post": { ... }
}
```

---

### DELETE /blog/:id

Delete blog post.

**Access:** Admin only
**CSRF:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Blog post deleted"
}
```

---

### GET /blog/categories

Get all blog categories with post counts.

**Access:** Public

**Response (200):**
```json
{
  "categories": [
    {
      "name": "vergi",
      "count": 15,
      "slug": "vergi"
    },
    {
      "name": "mevzuat",
      "count": 8,
      "slug": "mevzuat"
    }
  ]
}
```

---

### GET /blog/stats

Get blog statistics.

**Access:** Admin only

**Response (200):**
```json
{
  "stats": {
    "total": 50,
    "published": 45,
    "draft": 3,
    "scheduled": 2,
    "total_views": 15000,
    "avg_reading_time": 5.2,
    "top_posts": [
      {
        "id": "post-id",
        "title": "Popular Post",
        "views": 500
      }
    ],
    "categories": {
      "vergi": 15,
      "mevzuat": 8
    }
  }
}
```

---

## 📜 REGULATIONS

### GET /regulations

Get all regulations.

**Access:** Public

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `category` | string | Filter by category |
| `importance` | string | Filter by importance (low, medium, high, urgent) |

**Response (200):**
```json
{
  "regulations": [
    {
      "id": "regulation-id",
      "title": "Yeni Vergi Mevzuatı",
      "content": "Full content...",
      "category": "vergi",
      "regulation_date": "2026-01-01T00:00:00.000Z",
      "pdf_url": "/uploads/mevzuat.pdf",
      "importance": "high",
      "views": 100,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-13T00:00:00.000Z"
    }
  ]
}
```

---

### GET /regulations/:id

Get single regulation.

**Access:** Public

**Response (200):**
```json
{
  "regulation": { ... }
}
```

---

### POST /regulations

Create new regulation.

**Access:** Admin only

**Request:**
```json
{
  "title": "New Regulation",
  "content": "Full content...",
  "category": "vergi",
  "regulation_date": "2026-01-15T00:00:00.000Z",
  "pdf_url": "/uploads/doc.pdf",
  "importance": "high"
}
```

**Response (201):**
```json
{
  "success": true,
  "regulation": { ... }
}
```

---

### PUT /regulations/:id

Update regulation.

**Access:** Admin only

**Response (200):**
```json
{
  "success": true,
  "regulation": { ... }
}
```

---

### DELETE /regulations/:id

Delete regulation.

**Access:** Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Regulation deleted"
}
```

---

## 📧 SUBSCRIBERS & NEWSLETTER

### POST /subscribe

Subscribe to newsletter.

**Access:** Public
**Rate Limit:** 3 requests/minute

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Aboneliğiniz başarıyla tamamlandı"
}
```

**Automatic Actions:**
- Sends welcome email to `emir@onderdenetim.com`
- Creates subscriber record
- Generates unsubscribe token

---

### POST /unsubscribe

Unsubscribe from newsletter.

**Access:** Public

**Request:**
```json
{
  "email": "user@example.com",
  "token": "unsubscribe-token-optional"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Abonelikten çıkış başarıyla yapıldı"
}
```

---

### GET /subscribers

Get all subscribers (with pagination and filtering).

**Access:** Admin only

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page (default: 50) |
| `active` | boolean | Filter by active status |

**Response (200):**
```json
{
  "subscribers": [
    {
      "id": "subscriber-id",
      "email": "user@example.com",
      "subscribed_at": "2026-01-01T00:00:00.000Z",
      "is_active": true,
      "unsubscribe_token": "token"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 500,
    "total_pages": 10
  },
  "stats": {
    "total": 500,
    "active": 480,
    "inactive": 20
  }
}
```

---

### GET /subscribers/:id

Get single subscriber.

**Access:** Admin only

**Response (200):**
```json
{
  "subscriber": { ... }
}
```

---

### DELETE /subscribers/:id

Delete subscriber.

**Access:** Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Subscriber deleted"
}
```

---

## 📞 CONTACT FORM

### POST /contact

Submit contact form (TÜRMOB/KVKK compliant).

**Access:** Public
**Rate Limit:** 3 requests/minute per IP

**Request:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "phone": "0532 123 45 67",
  "company": "ABC Ltd. Şti.",
  "subject": "Vergi Danışmanlığı",
  "message": "Detaylı mesaj içeriği...",
  "kvkk_consent": true,
  "marketing_consent": false,
  "honeypot": ""
}
```

**Validation Rules:**
- `name`: 2-100 characters
- `email`: Valid RFC email format
- `phone`: Turkish format (0532 123 45 67)
- `subject`: 3-200 characters
- `message`: 10-2000 characters
- `kvkk_consent`: Must be `true`
- `honeypot`: Must be empty (spam protection)

**Response (201):**
```json
{
  "success": true,
  "message": "Mesajınız alındı",
  "ticket_id": "CNT-20260113-001",
  "contact": {
    "id": "contact-id",
    "ticket_id": "CNT-20260113-001",
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "status": "new",
    "created_at": "2026-01-13T00:00:00.000Z"
  }
}
```

**Automatic Actions:**
- Sends email to `emir@onderdenetim.com`
- Sends auto-response to customer
- Generates unique ticket ID

**Errors:**
- `400` - Validation failed
- `429` - Rate limit exceeded (retry after 60 seconds)

---

### GET /contact

Get all contact messages.

**Access:** Admin only

**Query Parameters:** `page`, `limit`, `status`, `priority`, `search`

**Response (200):**
```json
{
  "contacts": [ ... ],
  "pagination": { ... }
}
```

---

### GET /contact/:id

Get single contact message.

**Access:** Admin only

**Response (200):**
```json
{
  "contact": {
    "id": "contact-id",
    "ticket_id": "CNT-20260113-001",
    ...
    "notes": [
      {
        "id": "note-id",
        "note": "Customer called back",
        "added_by": "admin-id",
        "added_at": "2026-01-13T10:00:00.000Z"
      }
    ]
  }
}
```

---

### PUT /contact/:id/status

Update contact status.

**Access:** Admin only

**Request:**
```json
{
  "status": "in_progress",
  "priority": "high"
}
```

**Valid statuses:** `new`, `read`, `in_progress`, `replied`, `archived`
**Valid priorities:** `low`, `normal`, `high`, `urgent`

**Response (200):**
```json
{
  "success": true,
  "contact": { ... }
}
```

---

### POST /contact/:id/notes

Add note to contact message.

**Access:** Admin only

**Request:**
```json
{
  "note": "Called customer, will follow up tomorrow"
}
```

**Response (200):**
```json
{
  "success": true,
  "note": { ... }
}
```

---

### DELETE /contact/:id

Delete contact message.

**Access:** Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Contact deleted"
}
```

---

### GET /contact/stats

Get contact statistics.

**Access:** Admin only

**Response (200):**
```json
{
  "stats": {
    "total": 150,
    "by_status": {
      "new": 10,
      "in_progress": 8,
      "replied": 100,
      "archived": 32
    },
    "by_priority": {
      "low": 20,
      "normal": 100,
      "high": 25,
      "urgent": 5
    },
    "today": 5,
    "this_week": 32,
    "this_month": 150,
    "response_rate": 95.5,
    "avg_response_time_hours": 4.2
  }
}
```

---

## 💰 CALCULATORS (Mali Müşavirlik Tools)

### POST /calculators/income-tax

Calculate income tax (2026 Turkish tax brackets).

**Access:** Public

**Request:**
```json
{
  "annualIncome": 500000
}
```

**Response (200):**
```json
{
  "annualIncome": 500000,
  "totalTax": 115500,
  "netIncome": 384500,
  "effectiveRate": 23.1,
  "brackets": [
    {
      "min": 0,
      "max": 110000,
      "rate": 15,
      "taxableAmount": 110000,
      "tax": 16500
    }
  ]
}
```

---

### POST /calculators/net-salary

Calculate net salary from gross (Brüt → Net).

**Request:**
```json
{
  "grossSalary": 50000,
  "hasDisabilityDiscount": false
}
```

**Response (200):**
```json
{
  "grossSalary": 50000,
  "netSalary": 35847.5,
  "deductions": {
    "sgk_employee": 7500,
    "unemployment_insurance": 500,
    "income_tax": 5652.5,
    "stamp_tax": 500,
    "total": 14152.5
  },
  "sgk_employer": 11000,
  "total_cost": 61000
}
```

---

### POST /calculators/gross-salary

Calculate gross salary from net (Net → Brüt).

**Request:**
```json
{
  "netSalary": 35000,
  "hasDisabilityDiscount": false
}
```

**Response (200):**
```json
{
  "netSalary": 35000,
  "grossSalary": 48956.78,
  "deductions": { ... }
}
```

---

### POST /calculators/sgk

Calculate SGK premiums.

**Request:**
```json
{
  "grossSalary": 50000
}
```

**Response (200):**
```json
{
  "grossSalary": 50000,
  "employee": {
    "pension": 4500,
    "health": 2500,
    "unemployment": 500,
    "total": 7500,
    "rate": 15
  },
  "employer": {
    "pension": 5500,
    "health": 6000,
    "unemployment": 1000,
    "total": 12500,
    "rate": 25
  },
  "total": 20000
}
```

---

### POST /calculators/vat

Calculate VAT (KDV).

**Request:**
```json
{
  "amount": 100,
  "rate": 20,
  "includesVAT": false
}
```

**Response (200):**
```json
{
  "amount": 100,
  "rate": 20,
  "includesVAT": false,
  "vat": 20,
  "total": 120,
  "base": 100
}
```

---

### GET /calculators/tax-calendar

Get tax calendar.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | number | Month (1-12), optional |

**Example:**
```
GET /calculators/tax-calendar?month=1
```

**Response (200):**
```json
{
  "calendar": [
    {
      "date": "2026-01-15",
      "description": "Muhtasar Beyanname",
      "type": "declaration",
      "importance": "high"
    }
  ]
}
```

---

### GET /calculators/upcoming-tax-dates

Get upcoming tax dates.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | Days to look ahead |

**Response (200):**
```json
{
  "dates": [
    {
      "date": "2026-01-15",
      "description": "Muhtasar Beyanname",
      "days_until": 2,
      "type": "declaration"
    }
  ]
}
```

---

## 📊 ANALYTICS & MONITORING

### GET /monitoring/metrics

Get detailed system metrics.

**Access:** Admin only

**Response (200):**
```json
{
  "requests": {
    "total": 10000,
    "successful": 9500,
    "failed": 500,
    "successRate": "95.00%",
    "byStatusCode": {
      "200": 8000,
      "201": 1500,
      "400": 300,
      "404": 150,
      "500": 50
    },
    "topEndpoints": [
      {
        "endpoint": "GET /blog",
        "count": 2000,
        "avgResponseTime": 45
      }
    ]
  },
  "performance": {
    "avgResponseTime": 120,
    "p50": 80,
    "p95": 250,
    "p99": 500,
    "slowestEndpoints": [
      {
        "endpoint": "POST /blog",
        "slowCount": 15
      }
    ]
  },
  "errors": {
    "total": 500,
    "byType": {
      "ValidationError": 300,
      "DatabaseError": 50
    },
    "recent": [ ... ]
  },
  "security": {
    "blockedRequests": 100,
    "suspiciousActivity": 5,
    "failedAuth": 50
  },
  "database": {
    "queries": 5000,
    "slowQueries": 25,
    "errors": 5
  },
  "cache": {
    "hits": 3000,
    "misses": 2000,
    "hitRate": "60.00%"
  }
}
```

---

### GET /analytics/dashboard

Get analytics dashboard data.

**Access:** Admin only

**Response (200):**
```json
{
  "overview": {
    "totalBlogs": 50,
    "publishedBlogs": 45,
    "totalRegulations": 30,
    "activeSubscribers": 500,
    "totalContacts": 150,
    "newContactsLast30Days": 45
  },
  "engagement": {
    "totalBlogViews": 15000,
    "avgReadingTime": 5.2
  },
  "campaigns": {
    "total": 10,
    "emailsSent": 5000
  }
}
```

---

## 🏥 SYSTEM & HEALTH

### GET /health

Basic health check.

**Access:** Public

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2026-01-13T00:00:00.000Z",
  "environment": "production",
  "version": "2.0.0",
  "services": {
    "database": "operational",
    "mail": "configured",
    "social_media": {
      "linkedin": "configured",
      "instagram": "not_configured"
    }
  }
}
```

---

### GET /health/detailed

Detailed system health check.

**Access:** Admin only

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T00:00:00.000Z",
  "uptime": {
    "seconds": 86400,
    "formatted": "1d 0h 0m 0s"
  },
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 25000000,
    "external": 1000000,
    "usagePercent": "83.33%"
  },
  "performance": {
    "avgResponseTime": 120,
    "totalRequests": 10000,
    "requestsPerSecond": "0.12",
    "errorRate": "5.00%"
  },
  "database": {
    "status": "healthy",
    "type": "mongodb",
    "queries": 5000,
    "slowQueries": 25,
    "errors": 5
  },
  "cache": {
    "hits": 3000,
    "misses": 2000,
    "hitRate": "60.00%"
  },
  "security": {
    "blockedRequests": 100,
    "suspiciousActivity": 5,
    "failedAuth": 50
  }
}
```

---

### GET /cache/stats

Get cache statistics.

**Access:** Admin only

**Response (200):**
```json
{
  "type": "redis",
  "connected": true,
  "keyCount": 1500,
  "info": {
    "used_memory": "10485760",
    "connected_clients": "5"
  }
}
```

---

### POST /cache/clear

Clear all cache.

**Access:** Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

---

### GET /api-version

Get API version information.

**Access:** Public

**Response (200):**
```json
{
  "current": "v1",
  "supported": ["v1"],
  "deprecated": [],
  "changelog": {
    "v1": {
      "released": "2026-01-13",
      "status": "stable",
      "features": [
        "Authentication & Authorization",
        "Blog Management",
        "Contact Forms (TÜRMOB/KVKK)",
        "Calculators",
        "Advanced Security",
        "Monitoring & Metrics",
        "Caching Layer"
      ]
    }
  }
}
```

---

### GET /csrf-token

Get CSRF token for protected operations.

**Access:** Public

**Response (200):**
```json
{
  "csrfToken": "random-csrf-token-value"
}
```

**Usage:**
Include in subsequent requests:
```http
X-CSRF-Token: random-csrf-token-value
```

---

## ⚠️ ERROR CODES

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `201` | Created - Resource created successfully |
| `400` | Bad Request - Invalid request data |
| `401` | Unauthorized - Missing or invalid authentication |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource not found |
| `413` | Payload Too Large - Request body exceeds limit |
| `415` | Unsupported Media Type - Invalid content type |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server error |
| `503` | Service Unavailable - Server overloaded |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": ["Additional error details..."]
}
```

---

## 🔒 SECURITY

### Rate Limiting

**Global Limits:**
- 100 requests per 15 minutes (General)
- 5 requests per 15 minutes (Authentication)
- 3 requests per minute (Contact Form)
- 100 requests per hour (Calculators)

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 900
```

### CSRF Protection

Protected operations require CSRF token:
1. Get token: `GET /csrf-token`
2. Include in request: `X-CSRF-Token: token`

**Exempt Endpoints:**
- `POST /auth/signin`
- `POST /contact`
- `POST /subscribe`
- Public GET requests

### Input Validation

All inputs are automatically:
- Sanitized for XSS
- Checked for SQL injection
- Validated for type and format
- Length-limited

### KVKK Compliance

Contact form includes:
- Mandatory KVKK consent tracking
- Optional marketing consent
- Data retention policies
- Privacy by design

---

## 📨 NOTIFICATIONS

### Email Notifications

**From Address:** emir@onderdenetim.com

**Automatic Emails:**
1. **Welcome Email** - New subscribers
2. **Contact Confirmation** - Contact form submissions
3. **Admin Notification** - New contacts
4. **Blog Notification** - New blog posts (to subscribers)

---

## 🔑 API KEYS (Future Feature)

For external API access:

**Header:**
```
X-API-Key: your-api-key-here
```

**Tiers:**
- Free: 1,000 requests/day
- Premium: 10,000 requests/day
- Enterprise: 100,000 requests/day

---

## 📞 SUPPORT

**Email:** emir@onderdenetim.com
**Documentation:** https://docs.onderdenetim.com
**API Status:** https://status.onderdenetim.com

---

**API Version:** 1.0
**Last Updated:** 13 Ocak 2026
**© 2026 Önder Denetim. All rights reserved.**
