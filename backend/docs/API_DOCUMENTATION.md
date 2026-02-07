# Önder Denetim - Complete Backend API Documentation
## Express Backend API - Version 2.0

**Base URL:** `http://localhost:5000/api/v1`
**Content-Type:** `application/json`
**Authentication:** Bearer JWT Token (Header: `Authorization: Bearer <token>`)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Admin Management](#2-admin-management)
3. [Blog Management](#3-blog-management)
4. [Email Campaigns](#4-email-campaigns)
5. [Mevzuat (Regulations)](#5-mevzuat-regulations)
6. [Subscriber Management](#6-subscriber-management)
7. [Contact Messages](#7-contact-messages)
8. [Activity Logs](#8-activity-logs)
9. [File Upload](#9-file-upload)
10. [System & Health](#10-system--health)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Hata mesajı",
  "message": "Detaylı açıklama"
}
```

---

## 1. Authentication

### 1.1 Health Check
```
GET /health
Auth: No
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 1.2 Admin Sign In
```
POST /api/v1/auth/signin
Auth: No
```
**Body:**
```json
{
  "email": "admin@onderdenetim.com",
  "password": "your-password"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "token": "JWT_TOKEN_STRING",
    "user": {
      "id": "uuid",
      "email": "admin@onderdenetim.com",
      "name": "Admin Name",
      "role": "admin"
    }
  }
}
```

### 1.3 Create First Admin
```
POST /api/v1/auth/signup-admin
Auth: No (only for first admin)
```
**Body:**
```json
{
  "email": "admin@onderdenetim.com",
  "password": "secure-password",
  "name": "Site Yöneticisi"
}
```

### 1.4 Validate Session
```
POST /api/v1/auth/session
Auth: Bearer Token
```
**Body:**
```json
{
  "token": "JWT_TOKEN"
}
```
**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@onderdenetim.com",
    "name": "Admin Name",
    "role": "admin"
  }
}
```

---

## 2. Admin Management

### 2.1 Get All Admins
```
GET /api/v1/admin
Auth: Bearer Token (Admin, Super Admin)
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "admin@onderdenetim.com",
      "name": "Admin Name",
      "role": "admin",
      "created_at": "2024-01-15T10:00:00.000Z",
      "last_login": "2024-01-15T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 2.2 Get Current Admin Profile
```
GET /api/v1/admin/profile
Auth: Bearer Token
```

### 2.3 Create New Admin
```
POST /api/v1/admin
Auth: Bearer Token (Super Admin only)
```
**Body:**
```json
{
  "email": "newadmin@onderdenetim.com",
  "name": "New Admin",
  "role": "admin"
}
```
**Roles:** `admin`, `super_admin`, `editor`, `viewer`

### 2.4 Update Admin
```
PUT /api/v1/admin/:id
Auth: Bearer Token (Super Admin or Self)
```
**Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@onderdenetim.com",
  "role": "editor"
}
```

### 2.5 Delete Admin
```
DELETE /api/v1/admin/:id
Auth: Bearer Token (Super Admin only)
```

### 2.6 Change Password
```
POST /api/v1/admin/:id/change-password
Auth: Bearer Token
```
**Body:**
```json
{
  "old_password": "current-password",
  "new_password": "new-secure-password"
}
```

### 2.7 Get Dashboard Stats
```
GET /api/v1/admin/dashboard/stats
Auth: Bearer Token (Admin)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "total_blogs": 45,
    "total_subscribers": 1250,
    "total_contacts": 87,
    "recent_activities": 120
  }
}
```

### 2.8 Get Permissions List
```
GET /api/v1/admin/permissions/list
Auth: Bearer Token (Admin)
```

---

## 3. Blog Management

### 3.1 Get All Blog Posts
```
GET /api/v1/blog
Auth: No (Public) / Bearer Token (Admin - includes drafts)
Query Params:
  - status: published | draft
  - category: Genel | Vergi | Denetim | Mevzuat | SGK | Muhasebe
  - tag: string
  - search: string
  - page: number
  - limit: number (default: 20)
  - sort: created_at | publish_date | views
  - order: asc | desc
```
**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "title": "Blog Başlığı",
        "slug": "blog-basligi",
        "content": "<p>HTML content</p>",
        "excerpt": "Kısa özet",
        "category": "Vergi",
        "tags": ["kdv", "vergi"],
        "status": "published",
        "featured_image": "https://...",
        "author_id": "uuid",
        "seo_title": "SEO Title",
        "seo_description": "SEO Description",
        "reading_time": 5,
        "views": 120,
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-15T10:00:00.000Z",
        "publish_date": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 3.2 Get Blog Post by Slug
```
GET /api/v1/blog/:slug
Auth: No (Public)
```

### 3.3 Get Blog Categories
```
GET /api/v1/blog/categories
Auth: No (Public)
```
**Response:**
```json
{
  "success": true,
  "data": [
    "Genel",
    "Vergi",
    "Denetim",
    "Mevzuat",
    "SGK",
    "Muhasebe"
  ]
}
```

### 3.4 Get Blog Statistics
```
GET /api/v1/blog/stats
Auth: Bearer Token (Admin)
```

### 3.5 Create Blog Post
```
POST /api/v1/blog
Auth: Bearer Token (Admin, Editor)
```
**Body:**
```json
{
  "title": "Blog Başlığı",
  "content": "<p>HTML içerik</p>",
  "excerpt": "Kısa açıklama",
  "category": "Vergi",
  "tags": ["kdv", "vergi"],
  "status": "draft",
  "featured_image": "https://...",
  "seo_title": "SEO Başlık",
  "seo_description": "SEO Açıklama",
  "seo_keywords": "kdv, vergi, muhasebe",
  "publish_date": "2024-01-20T10:00:00.000Z"
}
```

### 3.6 Update Blog Post
```
PUT /api/v1/blog/:id
Auth: Bearer Token (Admin, Editor)
```

### 3.7 Delete Blog Post
```
DELETE /api/v1/blog/:id
Auth: Bearer Token (Admin)
```

---

## 4. Email Campaigns

### 4.1 Send Bulk Email
```
POST /api/v1/email/send-bulk
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "subject": "Newsletter Başlığı",
  "content": "<p>HTML içerik</p>",
  "template_id": "uuid (optional)"
}
```

### 4.2 Send Email to Selected Subscribers
```
POST /api/v1/email/send-selected
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "subject": "Email Başlığı",
  "content": "<p>HTML içerik</p>",
  "subscriber_ids": ["uuid1", "uuid2"]
}
```

### 4.3 Send Single Email
```
POST /api/v1/email/send-single
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "email": "user@example.com",
  "subject": "Email Başlığı",
  "content": "<p>HTML içerik</p>"
}
```

### 4.4 Get Email Templates
```
GET /api/v1/email/templates
Auth: Bearer Token (Admin)
```

### 4.5 Create Email Template
```
POST /api/v1/email/templates
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "name": "Welcome Email",
  "subject": "{{company_name}}'e Hoş Geldiniz",
  "content": "<p>Merhaba {{subscriber_name}}</p>",
  "variables": ["company_name", "subscriber_name", "unsubscribe_link"]
}
```

### 4.6 Update Email Template
```
PUT /api/v1/email/templates/:id
Auth: Bearer Token (Admin)
```

### 4.7 Delete Email Template
```
DELETE /api/v1/email/templates/:id
Auth: Bearer Token (Admin)
```

### 4.8 Get Email History
```
GET /api/v1/email/history
Auth: Bearer Token (Admin)
Query Params:
  - limit: number
  - offset: number
  - status: sent | failed | pending
```

### 4.9 Get Email Statistics
```
GET /api/v1/email/stats
Auth: Bearer Token (Admin)
```

### 4.10 Send Test Email
```
POST /api/v1/email/test
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "email": "test@example.com"
}
```

### 4.11 Send Blog Notification
```
POST /api/v1/email/blog-notification
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "blogId": "uuid",
  "recipientFilter": "all"
}
```

---

## 5. Mevzuat (Regulations)

### 5.1 Get All Regulations
```
GET /api/v1/regulations
Auth: No (Public) / Bearer Token (Admin - includes drafts)
Query Params:
  - sector: vergi | sgk | ticaret | is-hukuku | gumruk | muhasebe | denetim | diger
  - category: string
  - status: published | draft
  - search: string
  - limit: number (default: 20)
  - offset: number
  - sort: publish_date | created_at | views
  - order: asc | desc
```
**Response:**
```json
{
  "success": true,
  "data": {
    "regulations": [
      {
        "id": "uuid",
        "title": "Mevzuat Başlığı",
        "slug": "mevzuat-basligi",
        "description": "Açıklama",
        "content": "<p>HTML içerik</p>",
        "sector": "vergi",
        "category": "KDV",
        "status": "published",
        "tags": ["kdv", "stopaj"],
        "views": 85,
        "author_id": "uuid",
        "publish_date": "2024-01-15T10:00:00.000Z",
        "seo_title": "SEO Başlık",
        "seo_description": "SEO Açıklama",
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 32,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 5.2 Get Regulation by Slug
```
GET /api/v1/regulations/:slug
Auth: No (Public)
```

### 5.3 Get Sectors (Categories)
```
GET /api/v1/regulations/sectors
Auth: No (Public)
```
**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "vergi", "label": "Vergi Mevzuatı" },
    { "value": "sgk", "label": "SGK Mevzuatı" },
    { "value": "ticaret", "label": "Ticaret Hukuku" },
    { "value": "is-hukuku", "label": "İş Hukuku" },
    { "value": "gumruk", "label": "Gümrük Mevzuatı" },
    { "value": "muhasebe", "label": "Muhasebe Standartları" },
    { "value": "denetim", "label": "Denetim Mevzuatı" },
    { "value": "diger", "label": "Diğer" }
  ]
}
```

### 5.4 Get Regulation Statistics
```
GET /api/v1/regulations/stats
Auth: Bearer Token (Admin)
```

### 5.5 Create Regulation
```
POST /api/v1/regulations
Auth: Bearer Token (Admin, Editor)
```
**Body:**
```json
{
  "title": "Mevzuat Başlığı",
  "description": "Kısa açıklama",
  "content": "<p>HTML içerik - sayfa sayfa bilgi</p>",
  "sector": "vergi",
  "category": "KDV",
  "status": "draft",
  "tags": ["kdv", "stopaj"],
  "publish_date": "2024-01-20T10:00:00.000Z",
  "seo_title": "SEO Başlık",
  "seo_description": "SEO Açıklama"
}
```

### 5.6 Update Regulation
```
PUT /api/v1/regulations/:id
Auth: Bearer Token (Admin, Editor)
```

### 5.7 Delete Regulation
```
DELETE /api/v1/regulations/:id
Auth: Bearer Token (Admin)
```

---

## 6. Subscriber Management

### 6.1 Get All Subscribers
```
GET /api/v1/subscribers
Auth: Bearer Token (Admin)
Query Params:
  - status: active | unsubscribed | bounced
  - tag: string
  - search: string (email or name)
  - limit: number (default: 50)
  - offset: number
  - sort: subscribed_at | email
  - order: asc | desc
```
**Response:**
```json
{
  "success": true,
  "data": {
    "subscribers": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "User Name",
        "status": "active",
        "tags": ["premium", "interested-in-tax"],
        "subscribed_at": "2024-01-10T10:00:00.000Z",
        "updated_at": "2024-01-15T10:00:00.000Z",
        "source": "website",
        "preferences": {
          "blog_updates": true,
          "regulation_updates": true,
          "newsletters": true
        }
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 6.2 Get Subscriber by ID
```
GET /api/v1/subscribers/:id
Auth: Bearer Token (Admin)
```

### 6.3 Subscribe (Public)
```
POST /api/v1/subscribers/subscribe
Auth: No (Public)
```
**Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User (optional)"
}
```

### 6.4 Unsubscribe (Public)
```
POST /api/v1/subscribers/unsubscribe
Auth: No (Public)
```
**Body:**
```json
{
  "email": "user@example.com",
  "token": "unsubscribe-token (optional)"
}
```

### 6.5 Update Subscriber
```
PUT /api/v1/subscribers/:id
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "name": "Updated Name",
  "status": "active",
  "tags": ["vip", "interested-in-audit"],
  "preferences": {
    "blog_updates": true,
    "regulation_updates": false,
    "newsletters": true
  },
  "notes": "Important client"
}
```

### 6.6 Add Tag to Subscriber
```
POST /api/v1/subscribers/:id/tags
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "tag": "vip-client"
}
```

### 6.7 Remove Tag from Subscriber
```
DELETE /api/v1/subscribers/:id/tags/:tag
Auth: Bearer Token (Admin)
```

### 6.8 Delete Subscriber
```
DELETE /api/v1/subscribers/:id
Auth: Bearer Token (Admin)
```

### 6.9 Get Subscriber Statistics
```
GET /api/v1/subscribers/stats
Auth: Bearer Token (Admin)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "active": 1180,
    "unsubscribed": 65,
    "bounced": 5,
    "by_source": {
      "website": 1100,
      "import": 150
    },
    "by_tag": {
      "vip": 45,
      "interested-in-tax": 320
    },
    "recent_7_days": 23,
    "recent_30_days": 87
  }
}
```

### 6.10 Get All Tags
```
GET /api/v1/subscribers/tags
Auth: Bearer Token (Admin)
```

### 6.11 Bulk Update Status
```
POST /api/v1/subscribers/bulk-update
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "subscriber_ids": ["uuid1", "uuid2", "uuid3"],
  "status": "active"
}
```

---

## 7. Contact Messages

### 7.1 Submit Contact Form (Public)
```
POST /api/v1/contact
Auth: No (Public)
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+90 555 123 4567",
  "subject": "Denetim Hizmeti",
  "message": "Mesaj içeriği...",
  "kvkk_consent": true
}
```

### 7.2 Get All Contact Messages (Inbox)
```
GET /api/v1/contact
Auth: Bearer Token (Admin)
Query Params:
  - status: new | read | replied | archived
  - limit: number
  - offset: number
```
**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+90 555 123 4567",
        "subject": "Denetim Hizmeti",
        "message": "Mesaj içeriği...",
        "status": "new",
        "notes": [],
        "replied_at": null,
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 87,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 7.3 Get Contact Message by ID
```
GET /api/v1/contact/:id
Auth: Bearer Token (Admin)
```

### 7.4 Get Contact Statistics
```
GET /api/v1/contact/stats
Auth: Bearer Token (Admin)
```

### 7.5 Update Contact Status
```
PUT /api/v1/contact/:id/status
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "status": "read"
}
```

### 7.6 Add Note to Contact
```
POST /api/v1/contact/:id/notes
Auth: Bearer Token (Admin)
```
**Body:**
```json
{
  "note": "Müşteri ile görüşüldü. Teklif gönderildi."
}
```

### 7.7 Delete Contact Message
```
DELETE /api/v1/contact/:id
Auth: Bearer Token (Admin)
```

---

## 8. Activity Logs

### 8.1 Get All Logs
```
GET /api/v1/logs
Auth: Bearer Token (Admin)
Query Params:
  - user_id: uuid
  - action: create | update | delete | login | logout | etc.
  - entity: blog | regulation | subscriber | admin | email | etc.
  - entity_id: uuid
  - start_date: ISO8601
  - end_date: ISO8601
  - limit: number (default: 100)
  - offset: number
  - sort: timestamp
  - order: desc | asc
```
**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "action": "create",
        "entity": "blog",
        "entity_id": "uuid",
        "details": {
          "title": "Blog Title",
          "status": "published"
        },
        "timestamp": "2024-01-15T10:00:00.000Z",
        "user": {
          "id": "uuid",
          "name": "Admin Name",
          "email": "admin@onderdenetim.com",
          "role": "admin"
        }
      }
    ],
    "pagination": {
      "total": 1250,
      "limit": 100,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 8.2 Get Log by ID
```
GET /api/v1/logs/:id
Auth: Bearer Token (Admin)
```

### 8.3 Get Log Statistics
```
GET /api/v1/logs/stats
Auth: Bearer Token (Admin)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 15430,
    "by_action": {
      "create": 450,
      "update": 320,
      "delete": 45,
      "login": 1200
    },
    "by_entity": {
      "blog": 280,
      "regulation": 120,
      "subscriber": 550,
      "admin": 45
    },
    "by_user": {
      "uuid1": 450,
      "uuid2": 320
    },
    "recent_24h": 85,
    "recent_7d": 520,
    "recent_30d": 1840,
    "timeline": {
      "last_7_days": {
        "2024-01-15": 85,
        "2024-01-14": 92
      }
    },
    "top_users": [
      {
        "user_id": "uuid",
        "count": 450,
        "user_name": "Admin Name",
        "user_email": "admin@onderdenetim.com"
      }
    ]
  }
}
```

### 8.4 Get User Activity
```
GET /api/v1/logs/user/:userId
Auth: Bearer Token (Admin)
Query Params:
  - limit: number
  - offset: number
```

### 8.5 Get Entity Activity
```
GET /api/v1/logs/entity/:entity/:entityId
Auth: Bearer Token (Admin)
Query Params:
  - limit: number
  - offset: number
```

### 8.6 Export Logs
```
GET /api/v1/logs/export
Auth: Bearer Token (Admin)
Query Params:
  - user_id: uuid (optional)
  - action: string (optional)
  - entity: string (optional)
  - start_date: ISO8601 (optional)
  - end_date: ISO8601 (optional)
```
**Response:** JSON file download

### 8.7 Clear Old Logs
```
DELETE /api/v1/logs/clear
Auth: Bearer Token (Super Admin only)
```
**Body:**
```json
{
  "days": 90
}
```

---

## 9. File Upload

### 9.1 Upload Image
```
POST /api/v1/upload
Auth: Bearer Token (Admin, Editor)
Content-Type: multipart/form-data
```
**Form Data:**
- `file`: Image file (JPEG, PNG, WebP, GIF)
- `type`: blog | regulation | profile | general (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:5000/uploads/image-123.jpg",
    "filename": "image-123.jpg",
    "size": 245678,
    "mimetype": "image/jpeg"
  }
}
```

---

## 10. System & Health

### 10.1 Health Check
```
GET /api/v1/health
Auth: No
```

### 10.2 Get System Info
```
GET /api/v1/system/info
Auth: Bearer Token (Admin)
```

### 10.3 Create Backup
```
POST /api/v1/admin/backups/create
Auth: Bearer Token (Super Admin)
```

### 10.4 Get Backup History
```
GET /api/v1/admin/backups/history
Auth: Bearer Token (Admin)
```

### 10.5 Clear Cache
```
DELETE /api/v1/cache/clear
Auth: Bearer Token (Super Admin)
```

---

## Role-Based Permissions

### Roles:
- **super_admin**: Full access to all features
- **admin**: Full access except system-critical operations
- **editor**: Can create/edit content (blog, regulations)
- **viewer**: Read-only access to admin panel

### Permissions Matrix:

| Feature | Super Admin | Admin | Editor | Viewer |
|---------|-------------|-------|--------|--------|
| Manage Admins | ✅ | ❌ | ❌ | ❌ |
| Create/Edit Blog | ✅ | ✅ | ✅ | ❌ |
| Delete Blog | ✅ | ✅ | ❌ | ❌ |
| Create/Edit Regulations | ✅ | ✅ | ✅ | ❌ |
| Manage Subscribers | ✅ | ✅ | ❌ | ❌ |
| View Contact Messages | ✅ | ✅ | ✅ | ✅ |
| Send Email Campaigns | ✅ | ✅ | ❌ | ❌ |
| View Activity Logs | ✅ | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| Clear Logs | ✅ | ❌ | ❌ | ❌ |
| Create Backups | ✅ | ❌ | ❌ | ❌ |

---

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **File Upload**: 20 requests per hour

---

## Notes

1. All dates are in ISO 8601 format
2. All responses include `success` boolean field
3. Turkish characters are supported in slugs
4. File uploads are limited to 10MB
5. Email campaigns are tracked with delivery status
6. Activity logs are automatically created for all major actions
7. Subscribers can manage their preferences
8. Contact form includes KVKK compliance
9. Blog and Regulations support draft/published status
10. SEO fields are available for all content types

---

## Support

For API support, contact: **emir@onderdenetim.com**

**Documentation Version:** 2.0
**Last Updated:** 2024-02-07
