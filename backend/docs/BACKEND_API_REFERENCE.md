# Önder Denetim - Backend API Reference
# Express Backend: http://localhost:5000/api/v1

Bu döküman frontend kodunun tamamı incelenerek oluşturulmuştur.
Backend geliştiricisi bu dökümanı referans alarak tüm API endpoint'lerini, veritabanı şemalarını ve iş mantığını oluşturmalıdır.

---

## GENEL YAPILANDIRMA

```
Base URL: http://localhost:5000/api/v1
Content-Type: application/json
Auth: Bearer JWT Token (localStorage['admin_token'])
```

### Standart Response Formatı
```json
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı"
}
```

### Hata Response Formatı
```json
{
  "success": false,
  "error": "Hata mesajı",
  "message": "Detaylı açıklama"
}
```

---

## 1. AUTH (Kimlik Doğrulama)

### 1.1 Health Check
```
GET /health
Auth: Hayır
Response: { "status": "ok", "timestamp": "ISO8601" }
```

### 1.2 Admin Giriş
```
POST /auth/signin
Auth: Hayır
Body: {
  "email": "string",
  "password": "string"
}
Response: {
  "success": true,
  "data": {
    "token": "JWT_TOKEN_STRING",
    "user": {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "role": "super_admin | admin | editor"
    }
  }
}
```

### 1.3 Admin Kayıt (İlk Kurulum)
```
POST /auth/signup-admin
Auth: Hayır (sadece ilk admin için)
Body: {
  "email": "string",
  "password": "string",
  "name": "string"
}
Response: {
  "success": true,
  "data": {
    "token": "JWT_TOKEN_STRING",
    "user": { "id", "email", "name", "role" }
  }
}
```

### 1.4 Oturum Doğrulama
```
POST /auth/session
Auth: Bearer Token
Body: { "token": "JWT_TOKEN_STRING" }
Response: {
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string",
    "role": "super_admin | admin | editor"
  }
}
```

---

## 2. BLOG YÖNETİMİ

### 2.1 Tüm Blog Yazılarını Getir
```
GET /blog
Auth: Hayır (public) / Bearer (admin - draft dahil)
Query Params: ?status=published&category=Vergi&search=arama&page=1&limit=10
Response: {
  "posts": [
    {
      "id": "uuid",
      "title": "string",
      "slug": "url-slug",
      "content": "HTML string",
      "excerpt": "string",
      "category": "Genel | Vergi | Denetim | Mevzuat | SGK | Muhasebe",
      "tags": ["tag1", "tag2"],
      "status": "draft | published",
      "featured_image": "https://...",
      "image": "https://...",
      "author_id": "uuid",
      "seo_title": "string",
      "seo_description": "string",
      "seo_keywords": "string",
      "reading_time": 5,
      "views": 120,
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "publish_date": "ISO8601 | null"
    }
  ]
}
```

### 2.2 Tek Blog Yazısı (Slug ile)
```
GET /blog/:slug
Auth: Hayır
Response: {
  "post": { ...BlogPost }
}
Not: slug URL-safe formatında (türkçe karakter dönüşümlü)
```

### 2.3 Blog Oluştur
```
POST /blog
Auth: Bearer Token (admin, super_admin)
Body: {
  "title": "string (zorunlu)",
  "content": "HTML string (zorunlu)",
  "excerpt": "string",
  "category": "Genel | Vergi | Denetim | Mevzuat | SGK | Muhasebe",
  "tags": ["tag1", "tag2"],
  "status": "draft | published",
  "featured_image": "https://...",
  "image": "https://...",
  "seo_title": "string",
  "seo_description": "string",
  "seo_keywords": "string"
}
Response: {
  "success": true,
  "post": { ...BlogPost }
}
İş Mantığı:
  - slug otomatik oluşturulmalı (title'dan türkçe→ascii dönüşümü)
  - author_id JWT token'dan alınmalı
  - publish_date status=published ise otomatik set edilmeli
  - Activity log kaydı oluşturulmalı
```

### 2.4 Blog Güncelle
```
PUT /blog/:id
Auth: Bearer Token (admin, super_admin, editor-kendi yazısı)
Body: { ...Partial<BlogPost> }
Response: {
  "success": true,
  "post": { ...BlogPost }
}
İş Mantığı:
  - updated_at otomatik güncellenmeli
  - Activity log kaydı oluşturulmalı
```

### 2.5 Blog Sil
```
DELETE /blog/:id
Auth: Bearer Token (admin, super_admin)
Response: { "success": true, "message": "Blog silindi" }
İş Mantığı:
  - Activity log kaydı oluşturulmalı
```

---

## 3. MEVZUAT (Regulations) YÖNETİMİ

### 3.1 Tüm Mevzuatları Getir
```
GET /regulations
Auth: Hayır (public)
Query Params: ?category=Vergi&year=2026&search=arama
Response: {
  "regulations": [
    {
      "id": "uuid",
      "title": "string",
      "summary": "string",
      "content": "HTML string",
      "category": "Vergi | SGK | Muhasebe | Ticaret | İş Hukuku | Denetim | Diğer",
      "source": "Resmi Gazete | GİB | SGK | TÜRMOB | Maliye Bakanlığı | Danıştay | Diğer",
      "source_number": "string",
      "source_date": "YYYY-MM-DD",
      "effective_date": "YYYY-MM-DD",
      "regulation_date": "YYYY-MM-DD",
      "pdf_url": "https://...",
      "external_link": "https://...",
      "importance": "low | normal | high | critical",
      "status": "draft | published",
      "created_at": "ISO8601"
    }
  ]
}
```

### 3.2 Mevzuat Oluştur
```
POST /regulations
Auth: Bearer Token
Body: {
  "title": "string (zorunlu)",
  "content": "HTML string (zorunlu)",
  "summary": "string",
  "category": "string",
  "source": "string",
  "source_number": "string",
  "source_date": "YYYY-MM-DD",
  "effective_date": "YYYY-MM-DD",
  "regulation_date": "YYYY-MM-DD",
  "pdf_url": "string",
  "external_link": "string",
  "importance": "low | normal | high | critical",
  "notify_subscribers": true/false
}
Response: {
  "success": true,
  "regulation": { ...Regulation }
}
İş Mantığı:
  - notify_subscribers=true ise abonelere e-posta gönderilmeli
  - Activity log kaydı oluşturulmalı
```

### 3.3 Mevzuat Güncelle
```
PUT /regulations/:id
Auth: Bearer Token
Body: { ...Partial<Regulation>, "notify_subscribers": boolean }
Response: { "success": true, "regulation": { ...Regulation } }
```

### 3.4 Mevzuat Sil
```
DELETE /regulations/:id
Auth: Bearer Token
Response: { "success": true }
```

---

## 4. ABONE (Subscribers) YÖNETİMİ

### 4.1 Herkese Açık - Abone Ol
```
POST /subscribe
Auth: Hayır (public)
Body: { "email": "string" }
Response: { "success": true, "message": "Başarıyla abone oldunuz" }
İş Mantığı:
  - Email format doğrulaması
  - Duplicate kontrolü
  - Unsubscribe token oluşturulmalı
  - Onay e-postası gönderilebilir (isteğe bağlı)
  - source: "website_footer" olarak kaydedilmeli
  - Activity log kaydı
```

### 4.2 Herkese Açık - Abonelikten Çık
```
POST /unsubscribe
Auth: Hayır (public)
Body: { "token": "string" }
Response: { "success": true, "message": "Aboneliğiniz iptal edildi" }
İş Mantığı:
  - Token doğrulama
  - is_active = false yapılmalı
  - Zaten çıkmış ise bilgi mesajı: "zaten aboneliğiniz iptal edilmiş"
  - Activity log kaydı
```

### 4.3 Admin - Aboneleri Listele
```
GET /subscribers
Auth: Bearer Token
Response: {
  "subscribers": [
    {
      "id": "uuid",
      "email": "string",
      "name": "string | null",
      "subscribed_at": "ISO8601",
      "is_active": true/false,
      "source": "website_footer | blog_post | landing_page | manual | api | import",
      "tags": ["etiket1", "etiket2"],
      "unsubscribe_token": "string",
      "last_email_sent": "ISO8601 | null",
      "email_opens_count": 0,
      "email_clicks_count": 0
    }
  ]
}
```

### 4.4 Admin - Abone Ekle
```
POST /subscribers
Auth: Bearer Token
Body: {
  "email": "string",
  "name": "string (optional)",
  "source": "manual",
  "tags": ["tag1", "tag2"]
}
Response: { "success": true, "subscriber": { ... } }
```

### 4.5 Admin - Abone Güncelle
```
PUT /subscribers/:id
Auth: Bearer Token
Body: { "name": "string", "tags": ["..."], "is_active": boolean }
Response: { "success": true }
```

### 4.6 Admin - Abone Sil
```
DELETE /subscribers/:id
Auth: Bearer Token
Response: { "success": true }
```

### 4.7 Admin - Abone Durum Değiştir
```
PATCH /subscribers/:id/toggle-status
Auth: Bearer Token
Response: { "success": true, "is_active": boolean }
```

### 4.8 Admin - Toplu Silme
```
POST /subscribers/bulk-delete
Auth: Bearer Token
Body: { "ids": ["uuid1", "uuid2"] }
Response: { "success": true, "deleted_count": 5 }
```

---

## 5. İLETİŞİM MESAJLARI (Contact)

### 5.1 Herkese Açık - İletişim Formu
```
POST /contact
Auth: Hayır (public)
Body: {
  "name": "string (zorunlu, min 2)",
  "email": "string (zorunlu, geçerli email)",
  "phone": "string (optional, TR format)",
  "company": "string (optional)",
  "subject": "string (zorunlu, min 3)",
  "message": "string (zorunlu, min 10)",
  "kvkk_consent": true (zorunlu),
  "marketing_consent": false (optional)
}
Response: {
  "success": true,
  "message": "Mesajınız alındı",
  "data": {
    "id": "uuid",
    "submitted_at": "ISO8601"
  }
}
İş Mantığı:
  - kvkk_consent=true zorunlu
  - Admin'e bildirim e-postası gönderilebilir
  - Activity log kaydı
```

### 5.2 Admin - Mesajları Listele
```
GET /contact
Auth: Bearer Token
Response: {
  "messages": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string | null",
      "company": "string | null",
      "subject": "string",
      "message": "string",
      "category": "general | audit | consulting | technical | other",
      "status": "new | read | replied | archived",
      "notes": "string | null",
      "created_at": "ISO8601",
      "updated_at": "ISO8601 | null"
    }
  ]
}
```

### 5.3 Admin - Mesaj Durumu Güncelle
```
PATCH /contact/:id/status
Auth: Bearer Token
Body: { "status": "new | read | replied | archived" }
Response: { "success": true }
```

### 5.4 Admin - Mesaja Not Ekle
```
PATCH /contact/:id/notes
Auth: Bearer Token
Body: { "notes": "string" }
Response: { "success": true }
```

### 5.5 Admin - Mesaja Yanıt (E-posta)
```
POST /contact/:id/reply
Auth: Bearer Token
Body: {
  "subject": "string",
  "message": "string"
}
Response: { "success": true, "message": "Yanıt gönderildi" }
İş Mantığı:
  - E-posta gönderimi
  - status otomatik "replied" olarak güncellenmeli
  - Activity log kaydı
```

### 5.6 Admin - Mesaj Sil
```
DELETE /contact/:id
Auth: Bearer Token
Response: { "success": true }
```

---

## 6. E-POSTA (Email) YÖNETİMİ

### 6.1 Tüm Abonelere Bülten Gönder
```
POST /mail/send-newsletter
Auth: Bearer Token
Body: {
  "type": "blog | regulation",
  "item_id": "uuid"
}
Response: {
  "success": true,
  "sent": 150,
  "failed": 2
}
İş Mantığı:
  - Sadece is_active=true abonelere gönderilmeli
  - Her e-postada kişiye özel unsubscribe link'i olmalı
  - Email history kaydı oluşturulmalı
  - Activity log kaydı
```

### 6.2 Seçili Abonelere Gönder
```
POST /mail/send-to-selected
Auth: Bearer Token
Body: {
  "type": "blog | regulation",
  "item_id": "uuid",
  "subscriber_ids": ["uuid1", "uuid2"]
}
Response: { "success": true, "sent": 10, "failed": 0 }
```

### 6.3 Tek E-posta Adresine Gönder
```
POST /mail/send-to-email
Auth: Bearer Token
Body: {
  "type": "blog | regulation",
  "item_id": "uuid",
  "email": "string"
}
Response: { "success": true }
```

### 6.4 Test E-postası
```
POST /mail/send-test
Auth: Bearer Token
Body: {
  "email": "string",
  "type": "blog | regulation",
  "item_id": "uuid"
}
Response: { "success": true }
```

### 6.5 Toplu E-posta Gönder (Özel İçerik)
```
POST /email/send-bulk
Auth: Bearer Token
Body: {
  "subject": "string",
  "content": "HTML string",
  "recipients": ["email1@test.com", "email2@test.com"]
}
Response: { "sent": 148, "failed": 2 }
```

### Email Templates (Opsiyonel - frontend'de tanımlı)
```
Veri Yapısı:
{
  "id": "uuid",
  "name": "string",
  "subject": "string",
  "content": "HTML string",
  "category": "newsletter | notification | announcement | custom",
  "created_at": "ISO8601",
  "last_used": "ISO8601 | null"
}
Değişkenler: {name}, {month}, {year}, {company}
```

---

## 7. ADMIN KULLANICI YÖNETİMİ

### 7.1 Admin Listele
```
GET /admin/users
Auth: Bearer Token (super_admin)
Response: {
  "users": [
    {
      "id": "uuid",
      "email": "string",
      "name": "string",
      "role": "super_admin | admin | editor",
      "created_at": "ISO8601",
      "last_login": "ISO8601 | null",
      "status": "active | inactive"
    }
  ]
}
```

### 7.2 Admin Oluştur
```
POST /admin/users
Auth: Bearer Token (super_admin)
Body: {
  "email": "string",
  "name": "string",
  "password": "string",
  "role": "super_admin | admin | editor"
}
Response: { "success": true, "user": { ... } }
```

### 7.3 Admin Güncelle
```
PUT /admin/users/:id
Auth: Bearer Token (super_admin)
Body: {
  "email": "string",
  "name": "string",
  "role": "super_admin | admin | editor"
}
Response: { "success": true }
```

### 7.4 Admin Sil
```
DELETE /admin/users/:id
Auth: Bearer Token (super_admin)
Response: { "success": true }
İş Mantığı:
  - super_admin kendini silemez
  - Son super_admin silinemez
```

### Rol Yetkileri
```
super_admin:
  - Tüm yetkiler
  - Admin ekleme/çıkarma
  - Site ayarları
  - Tehlikeli işlemler (silme, yedekleme)

admin:
  - Blog CRUD
  - Mevzuat CRUD
  - E-posta gönderme
  - Abone yönetimi
  - İletişim mesajları
  - Raporlar

editor:
  - Blog oluştur/düzenle (sadece kendi yazıları)
  - Mevzuat oluştur/düzenle
  - İçerik önizleme
```

---

## 8. AKTİVİTE LOGLARI

### 8.1 Logları Getir
```
GET /logs
Auth: Bearer Token
Query Params: ?category=blog&level=error&page=1&limit=50
Response: {
  "logs": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "action": "Blog yazısı oluşturuldu",
      "category": "blog | email | subscriber | regulation | settings | auth | contact | other",
      "level": "info | success | warning | error",
      "details": "string | null",
      "metadata": {
        "ip": "string",
        "userAgent": "string",
        "resource": "blog_post",
        "resourceId": "uuid"
      },
      "timestamp": "ISO8601",
      "is_read": true/false
    }
  ]
}
```

### 8.2 Log Okundu İşaretle
```
PATCH /activity-logs/:id/read
Auth: Bearer Token
Response: { "success": true }
```

### 8.3 Log Sil
```
DELETE /activity-logs/:id
Auth: Bearer Token
Response: { "success": true }
```

### 8.4 Eski Logları Temizle
```
DELETE /activity-logs/clear-old
Auth: Bearer Token (super_admin)
Response: { "success": true, "deleted_count": 250 }
İş Mantığı: 30 günden eski logları siler
```

### Otomatik Log Oluşturulacak Olaylar
```
- auth.login            → Admin giriş yaptı
- auth.logout           → Admin çıkış yaptı
- auth.login_failed     → Başarısız giriş denemesi
- blog.created          → Blog yazısı oluşturuldu
- blog.updated          → Blog yazısı güncellendi
- blog.deleted          → Blog yazısı silindi
- blog.published        → Blog yazısı yayınlandı
- regulation.created    → Mevzuat oluşturuldu
- regulation.updated    → Mevzuat güncellendi
- regulation.deleted    → Mevzuat silindi
- subscriber.new        → Yeni abone
- subscriber.deleted    → Abone silindi
- subscriber.unsubscribed → Abonelikten çıkıldı
- email.sent            → E-posta gönderildi
- email.bulk_sent       → Toplu e-posta gönderildi
- contact.new           → Yeni iletişim mesajı
- contact.replied       → İletişim mesajına yanıt
- contact.deleted       → İletişim mesajı silindi
- admin.created         → Yeni admin oluşturuldu
- admin.deleted         → Admin silindi
- admin.role_changed    → Admin rolü değiştirildi
- settings.updated      → Ayarlar güncellendi
- backup.created        → Yedek oluşturuldu
```

---

## 9. ANALİTİK

### 9.1 Olay Takibi (Public)
```
POST /analytics/track
Auth: Hayır (public)
Body: {
  "event_name": "page_view | blog_view | regulation_view | newsletter_subscribe | contact_form_submit | calculator_use | file_download | social_click | external_link_click | search | error | performance_metrics",
  "event_data": { ... (olay bazlı) },
  "timestamp": "ISO8601",
  "page_url": "string",
  "referrer": "string",
  "user_agent": "string"
}
Response: { "success": true }
```

### 9.2 Dashboard İstatistikleri
```
GET /analytics/dashboard?range=7d|30d|90d
Auth: Bearer Token
Response: {
  "pageViews": { "current": 1250, "previous": 1100, "change": 13.6, "trend": "up" },
  "uniqueVisitors": { "current": 890, "previous": 820, "change": 8.5, "trend": "up" },
  "avgSessionTime": { "current": "3:24", "previous": "3:10", "change": 7.3, "trend": "up" },
  "bounceRate": { "current": 42.5, "previous": 45.2, "change": -5.9, "trend": "down" },
  "newSubscribers": { "current": 28, "previous": 22, "change": 27.3, "trend": "up" },
  "emailsSent": { "current": 450, "previous": 380, "change": 18.4, "trend": "up" },
  "contactMessages": { "current": 15, "previous": 12, "change": 25.0, "trend": "up" },
  "topPages": [
    { "page": "/", "views": 450, "bounce": 35 },
    { "page": "/blog", "views": 280, "bounce": 42 }
  ],
  "trafficSources": [
    { "name": "Organik", "value": 450, "percentage": 45 },
    { "name": "Direkt", "value": 300, "percentage": 30 }
  ],
  "blogPerformance": [
    { "category": "Vergi", "views": 320, "engagement": 78 }
  ],
  "contactMessagesCategory": [
    { "name": "Genel", "value": 5, "color": "#3b82f6" }
  ],
  "contactMessagesTrend": [
    { "day": "Pzt", "count": 3 }
  ],
  "weeklyTrend": [
    { "day": "Pzt", "views": 180, "visitors": 120, "posts": 2 }
  ]
}
```

### 9.3 Analytics Özeti
```
GET /analytics/summary?range=7d|30d|90d
Auth: Bearer Token
Response: {
  "total_events": 5000,
  "recent_events": 1200,
  "event_types": [
    { "name": "page_view", "count": 3500 }
  ],
  "popular_pages": [
    { "page": "/blog/vergi-rehberi", "views": 450 }
  ],
  "daily_stats": [
    { "date": "2026-02-01", "count": 180 }
  ],
  "previous_period": { "total_events": 4500, "recent_events": 1000 }
}
```

### 9.4 E-posta İstatistikleri
```
GET /analytics/mail?range=7d|30d|90d
Auth: Bearer Token
Response: {
  "total_sent": 1500,
  "sent_by_month": [
    { "month": "Ocak", "count": 300 }
  ],
  "recipient_stats": {
    "total_campaigns": 12,
    "total_recipients": 1500,
    "average_recipients_per_campaign": 125
  },
  "unsubscribes": 8,
  "unsubscribe_rate": "0.53%",
  "previous_period": { "total_campaigns": 10, "total_recipients": 1200 }
}
```

### 9.5 Performans Metrikleri
```
GET /analytics/performance?range=7d|30d|90d
Auth: Bearer Token
Response: {
  "average_page_load": 1.8,
  "average_dom_ready": 0.9,
  "total_measurements": 5000,
  "previous_period": { "average_page_load": 2.1 }
}
```

---

## 10. GENEL İSTATİSTİKLER

```
GET /stats
Auth: Bearer Token
Response: {
  "blog_posts": 45,
  "published_posts": 38,
  "draft_posts": 7,
  "regulations": 120,
  "active_subscribers": 350,
  "total_subscribers": 380,
  "contact_messages": 25,
  "unread_messages": 5,
  "today_messages": 2,
  "this_month_posts": 8,
  "total_page_views": 15000,
  "total_email_sent": 1500
}
```

---

## 11. DOSYA YÜKLEME

### 11.1 Görsel Yükleme
```
POST /upload/image
Auth: Bearer Token
Content-Type: multipart/form-data
Body:
  - file: File (max 5MB, image/jpeg, image/png, image/webp, image/gif)
  - category: "blog | regulation | team"
Response: {
  "success": true,
  "url": "https://storage.example.com/images/blog/xxxx.jpg"
}
İş Mantığı:
  - 5MB boyut limiti
  - Sadece image tiplerini kabul et
  - Kategori bazlı klasörleme
  - Dosya adını unique yap (uuid veya timestamp)
```

---

## 12. AYARLAR (Settings)

### 12.1 Site Ayarları
```
PUT /admin/settings/site
Auth: Bearer Token (super_admin, admin)
Body: {
  "siteName": "Önder Denetim",
  "siteDescription": "Mali Müşavirlik ve Bağımsız Denetim",
  "siteUrl": "https://onderdenetim.com",
  "contactEmail": "info@onderdenetim.com",
  "contactPhone": "+90 212 XXX XX XX",
  "address": "İstanbul, Türkiye",
  "googleAnalyticsId": "G-XXXXXXXXXX",
  "enableAnalytics": true,
  "enableCookieConsent": true,
  "maintenanceMode": false
}
```

### 12.2 SEO Ayarları
```
PUT /admin/settings/seo
Auth: Bearer Token (super_admin, admin)
Body: {
  "metaTitle": "Önder Denetim | Mali Müşavirlik",
  "metaDescription": "İstanbul merkezli mali müşavirlik...",
  "metaKeywords": "mali müşavirlik, denetim, vergi",
  "ogImage": "https://...",
  "twitterHandle": "@onderdenetim",
  "enableSitemap": true,
  "enableRobots": true,
  "canonicalUrl": "https://onderdenetim.com"
}
```

### 12.3 Güvenlik Ayarları
```
PUT /admin/settings/security
Auth: Bearer Token (super_admin)
Body: {
  "enableTwoFactor": false,
  "sessionTimeout": 30,
  "maxLoginAttempts": 5,
  "enableIpWhitelist": false,
  "enableActivityLog": true,
  "passwordMinLength": 8,
  "requireSpecialChars": true,
  "enableRateLimiting": true
}
```

### 12.4 Yedekleme Ayarları
```
PUT /admin/settings/backup
Auth: Bearer Token (super_admin)
Body: {
  "enableAutoBackup": true,
  "backupFrequency": "daily | weekly | monthly",
  "backupRetention": 30,
  "backupLocation": "local | s3 | gdrive | dropbox",
  "enableCloudBackup": false
}
```

### 12.5 Manuel Yedek Oluştur
```
POST /admin/backup/create
Auth: Bearer Token (super_admin)
Response: { "success": true, "filename": "backup-2026-02-07.zip" }
```

### 12.6 Bildirim Ayarları
```
PUT /admin/settings/notifications
Auth: Bearer Token (super_admin, admin)
Body: {
  "enableEmailNotifications": true,
  "notifyOnNewComment": true,
  "notifyOnNewSubscriber": true,
  "notifyOnNewContact": true,
  "notifyOnSystemError": true,
  "notificationEmail": "admin@onderdenetim.com",
  "enableSlackNotifications": false,
  "slackWebhook": ""
}
```

---

## 13. SOSYAL MEDYA ENTEGRASYONU (İleri Seviye - Opsiyonel)

### 13.1 Platform Durumları
```
GET /integrations/social
Auth: Bearer Token
Response: {
  "platforms": [
    {
      "id": "linkedin",
      "name": "LinkedIn",
      "connected": true,
      "account": { "name": "Önder Denetim", "username": "@onder", "followers": 1200 },
      "settings": {
        "autoPost": true,
        "postTypes": ["blog", "regulation"],
        "hashtags": ["#malimüşavirlik"]
      }
    }
  ]
}
```

### 13.2 Platform Bağlantısını Kes
```
DELETE /integrations/social/:platformId/disconnect
Auth: Bearer Token (super_admin)
```

### 13.3 Platform Ayarları
```
PUT /integrations/social/:platformId/settings
Auth: Bearer Token
Body: {
  "autoPost": true,
  "postTypes": ["blog", "regulation", "announcement"],
  "hashtags": ["#tag1", "#tag2"]
}
```

### 13.4 Sosyal Medyaya Paylaş
```
POST /integrations/social/post
Auth: Bearer Token
Body: {
  "platforms": ["linkedin", "facebook", "instagram", "twitter"],
  "content": "string",
  "scheduledFor": "ISO8601 | null"
}
```

### 13.5 Zamanlanmış Paylaşımlar
```
GET /integrations/scheduled-posts
Auth: Bearer Token
Response: {
  "posts": [
    {
      "id": "uuid",
      "platform": ["linkedin"],
      "content": "string",
      "scheduledFor": "ISO8601",
      "status": "scheduled | posted | failed",
      "engagement": { "likes": 10, "comments": 2, "shares": 5 }
    }
  ]
}
```

---

## VERİTABANI ŞEMASI (PostgreSQL)

```sql
-- ============================================
-- 1. ADMIN USERS
-- ============================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'admin', 'editor')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. BLOG POSTS
-- ============================================
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category VARCHAR(100) DEFAULT 'Genel',
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured_image TEXT,
  author_id UUID REFERENCES admin_users(id),
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  reading_time INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  publish_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blog_slug ON blog_posts(slug);
CREATE INDEX idx_blog_status ON blog_posts(status);
CREATE INDEX idx_blog_category ON blog_posts(category);
CREATE INDEX idx_blog_created ON blog_posts(created_at DESC);

-- ============================================
-- 3. REGULATIONS (MEVZUAT)
-- ============================================
CREATE TABLE regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'Vergi',
  source VARCHAR(100) DEFAULT 'Resmi Gazete',
  source_number VARCHAR(100),
  source_date DATE,
  effective_date DATE,
  regulation_date DATE,
  pdf_url TEXT,
  external_link TEXT,
  importance VARCHAR(20) DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reg_category ON regulations(category);
CREATE INDEX idx_reg_date ON regulations(regulation_date DESC);
CREATE INDEX idx_reg_importance ON regulations(importance);

-- ============================================
-- 4. SUBSCRIBERS (ABONELER)
-- ============================================
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  source VARCHAR(50) DEFAULT 'website_footer',
  tags TEXT[] DEFAULT '{}',
  unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
  last_email_sent TIMESTAMP,
  email_opens_count INTEGER DEFAULT 0,
  email_clicks_count INTEGER DEFAULT 0,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sub_email ON subscribers(email);
CREATE INDEX idx_sub_active ON subscribers(is_active);

-- ============================================
-- 5. CONTACT MESSAGES
-- ============================================
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'audit', 'consulting', 'technical', 'other')),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  notes TEXT,
  kvkk_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_status ON contact_messages(status);
CREATE INDEX idx_contact_created ON contact_messages(created_at DESC);

-- ============================================
-- 6. EMAIL HISTORY
-- ============================================
CREATE TABLE email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(500) NOT NULL,
  content TEXT,
  type VARCHAR(50) CHECK (type IN ('newsletter', 'notification', 'announcement', 'custom', 'contact_reply')),
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'partial')),
  related_type VARCHAR(50),
  related_id UUID,
  sent_by UUID REFERENCES admin_users(id),
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_sent ON email_history(sent_at DESC);

-- ============================================
-- 7. EMAIL TEMPLATES
-- ============================================
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'custom' CHECK (category IN ('newsletter', 'notification', 'announcement', 'custom')),
  variables TEXT[] DEFAULT '{}',
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. ACTIVITY LOGS
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id),
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  action VARCHAR(500) NOT NULL,
  category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('blog', 'email', 'subscriber', 'regulation', 'settings', 'auth', 'contact', 'other')),
  level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
  details TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  resource_type VARCHAR(100),
  resource_id UUID,
  is_read BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_category ON activity_logs(category);
CREATE INDEX idx_logs_level ON activity_logs(level);
CREATE INDEX idx_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_logs_user ON activity_logs(user_id);

-- ============================================
-- 9. ANALYTICS EVENTS
-- ============================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(50),
  session_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_page ON analytics_events(page_url);

-- ============================================
-- 10. SITE SETTINGS
-- ============================================
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

-- Default settings
INSERT INTO site_settings (key, value, category) VALUES
  ('site_info', '{"siteName":"Önder Denetim","siteDescription":"Mali Müşavirlik","siteUrl":"https://onderdenetim.com","contactEmail":"info@onderdenetim.com","contactPhone":"","address":"İstanbul"}', 'general'),
  ('seo', '{"metaTitle":"","metaDescription":"","metaKeywords":"","ogImage":"","enableSitemap":true,"enableRobots":true}', 'seo'),
  ('security', '{"sessionTimeout":30,"maxLoginAttempts":5,"enableActivityLog":true,"passwordMinLength":8}', 'security'),
  ('notifications', '{"enableEmailNotifications":true,"notifyOnNewContact":true,"notifyOnNewSubscriber":true}', 'notifications'),
  ('maintenance', '{"enabled":false,"message":"Bakım çalışması devam etmektedir"}', 'general');

-- ============================================
-- 11. SOCIAL MEDIA CONNECTIONS (Opsiyonel)
-- ============================================
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter')),
  access_token TEXT,
  refresh_token TEXT,
  account_name VARCHAR(255),
  account_username VARCHAR(255),
  followers_count INTEGER DEFAULT 0,
  auto_post BOOLEAN DEFAULT false,
  post_types TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  connected_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platforms TEXT[] NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'failed', 'cancelled')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ÖNCELİK SIRASI (Geliştirme Önerisi)

### Faz 1 - Temel (MVP)
1. Auth (signin, session, signup-admin)
2. Blog CRUD
3. Regulations CRUD
4. Contact form
5. Newsletter subscribe/unsubscribe
6. Health check

### Faz 2 - Admin Panel
7. Subscribers yönetimi (CRUD, toggle status, bulk delete)
8. Contact messages yönetimi (status, notes, reply)
9. Admin user yönetimi (CRUD, roller)
10. Activity logs (CRUD, otomatik logging)
11. File upload (images)
12. Stats endpoint

### Faz 3 - E-posta
13. Mail send-newsletter
14. Mail send-to-selected / send-to-email
15. Mail send-test
16. Email bulk send
17. Email history tracking
18. Email templates

### Faz 4 - Analytics
19. Analytics track (public event collection)
20. Analytics dashboard endpoint
21. Analytics summary
22. Analytics mail stats
23. Analytics performance

### Faz 5 - Ayarlar & İleri
24. Site settings CRUD
25. SEO settings
26. Security settings
27. Backup settings & create
28. Notification settings
29. Social media integration (opsiyonel)

---

## NOTLAR

1. **JWT Token**: Tüm admin endpoint'leri `Authorization: Bearer <token>` header'ı gerektirir
2. **CORS**: Frontend `localhost:5173` (Vite dev) ve `onderdenetim.com` (production) adreslerinden gelecek
3. **Rate Limiting**: Public endpoint'lere (contact, subscribe, analytics/track) rate limit uygulanmalı
4. **Email Service**: Nodemailer + SMTP veya SendGrid/Resend gibi bir servis kullanılabilir
5. **File Storage**: Local disk veya S3-compatible (Cloudflare R2, AWS S3) kullanılabilir
6. **Password Hashing**: bcrypt kullanılmalı
7. **Input Validation**: express-validator veya zod kullanılmalı
8. **Slug Generation**: Türkçe karakter dönüşümü (ğ→g, ş→s, ü→u, ö→o, ç→c, ı→i)
9. **Pagination**: Büyüyen veriler için tüm list endpoint'lerine pagination eklenebilir
10. **Frontend Base URL**: `http://localhost:5000/api/v1` - production'da değiştirilmeli (environment variable)
