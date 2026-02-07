# 📚 ÖNDER DENETİM BACKEND - DOKÜMANTASYON

**Version:** 3.0.0
**Son Güncelleme:** 13 Ocak 2026
**Durum:** ✅ Production Ready

---

## 🚀 HIZLI BAŞLANGIÇ

### Backend'i Çalıştırma

```bash
cd backend
npm install
npm start
```

Server başlatılacak: `http://localhost:5000`

**Not:** Tüm API endpoint'leri `/api/v1` prefix'i gerektirir.

---

## 📖 DOKÜMANTASYON LİSTESİ

### 1. [BACKEND_OVERVIEW.md](./BACKEND_OVERVIEW.md)
**Genel bakış ve hızlı başlangıç kılavuzu**
- Özellikler ve yetenekler
- Tech stack
- Proje yapısı
- Quick start guide
- Troubleshooting

### 2. [API_REFERENCE_COMPLETE.md](./API_REFERENCE_COMPLETE.md)
**Kapsamlı API referans dokümantasyonu**
- 100+ endpoint detaylı dokümantasyonu
- Request/response örnekleri
- Authentication bilgileri
- Rate limiting detayları
- Error kodları

### 3. [PERFORMANCE_SECURITY_ANALYSIS.md](./PERFORMANCE_SECURITY_ANALYSIS.md)
**Performans ve güvenlik analiz raporu**
- Performans analizi ve optimizasyonlar
- İzleme ve gözlemlenebilirlik
- Güvenlik analizi (85/100 puan)
- Fonksiyon ve özellikler
- Admin panel yetenekleri
- Öneriler ve iyileştirmeler

---

## 🎯 ÖNE ÇIKAN ÖZELLİKLER

### Güvenlik
- ✅ JWT Authentication (7 gün expiration)
- ✅ CSRF Protection (double-submit cookie)
- ✅ Advanced Rate Limiting (sliding window)
- ✅ Input Sanitization (XSS, SQL injection)
- ✅ KVKK/GDPR Compliance
- ✅ Security Event Logging

### Performans
- ✅ Redis Caching (in-memory fallback)
- ✅ MongoDB Indexing
- ✅ Response Compression
- ✅ Cache Invalidation Patterns
- ✅ Optimized Query Patterns

### Monitoring
- ✅ Request Tracking (total, success, fail)
- ✅ Performance Metrics (P50, P95, P99)
- ✅ Error Tracking by Type
- ✅ Security Event Monitoring
- ✅ System Health Checks
- ✅ Configurable Alerting

### API Features
- ✅ RESTful API Design
- ✅ API Versioning (v1)
- ✅ Complete CRUD Operations
- ✅ Pagination & Filtering
- ✅ Search Capabilities
- ✅ Rate Limiting

---

## 📡 API ENDPOINT'LERİ

**Tüm endpoint'ler `/api/v1` prefix'i gerektirir!**

### Public Endpoints
```
GET    /api/v1/health
GET    /api/v1/blog
GET    /api/v1/regulations
POST   /api/v1/contact
POST   /api/v1/auth/signin
POST   /api/v1/calculators/income-tax
GET    /api/v1/calculators/tax-calendar
...ve daha fazlası
```

### Protected Endpoints (Admin)
```
POST   /api/v1/blog
PUT    /api/v1/blog/:id
DELETE /api/v1/blog/:id
GET    /api/v1/contact
GET    /api/v1/monitoring/metrics
GET    /api/v1/cache/stats
...ve daha fazlası
```

**Detaylı dokümantasyon için:** [API_REFERENCE_COMPLETE.md](./API_REFERENCE_COMPLETE.md)

---

## 🔑 ÖNEMLİ BİLGİLER

### Base URL
```
Development:  http://localhost:5000/api/v1
Production:   https://api.onderdenetim.com/api/v1
```

### Authentication
```http
POST /api/v1/auth/signin

Authorization: Bearer <jwt-token>
```

### Rate Limiting
- Global: 100 req/15min
- Auth: 5 req/15min
- Contact: 3 req/min
- Calculators: Public

### CSRF Protection
```http
GET /api/v1/csrf-token
X-CSRF-Token: <token>
```

---

## 🗄️ DATABASE

### Development
- **In-Memory Store** (Otomatik)
- Kurulum gerektirmez
- Test ve development için ideal

### Production
- **MongoDB** (Önerilen)
- Connection pooling
- Automatic indexing
- Fallback to in-memory

**Kurulum:**
```bash
DATABASE_URL=mongodb://localhost:27017/onderdenetim
```

---

## 📊 PERFORMANS

### Caching
```javascript
{
  "Blog Post": "5 dakika",
  "Blog List": "1 dakika",
  "Regulations": "5 dakika",
  "Calculators": "1 saat",
  "Tax Calendar": "24 saat"
}
```

### Response Times (Tahmini)
```
/api/v1/health         ~  3-10ms
/api/v1/calculators/*  ~  5-30ms
/api/v1/blog (cached)  ~ 20-100ms
/api/v1/auth/signin    ~ 200-600ms
```

---

## 🔒 GÜVENLİK

### Güvenlik Puanı: 85/100

**Güçlü Yönler:**
- ✅ Modern authentication (JWT)
- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ CSRF protection
- ✅ Advanced rate limiting
- ✅ Input validation & sanitization
- ✅ Security headers (Helmet)
- ✅ KVKK compliance

**İyileştirme Alanları:**
- ⚠️ 2FA implementation
- ⚠️ Refresh token mechanism
- ⚠️ Database encryption at rest
- ⚠️ API key rotation

**Detaylı analiz:** [PERFORMANCE_SECURITY_ANALYSIS.md](./PERFORMANCE_SECURITY_ANALYSIS.md)

---

## 💰 CALCULATORS (2026 Vergi Dilimleri)

### Mevcut Hesaplayıcılar
1. **Income Tax** - Gelir vergisi hesaplama
2. **Net Salary** - Brüt → Net maaş
3. **Gross Salary** - Net → Brüt maaş
4. **SGK** - SGK kesinti hesaplama
5. **VAT** - KDV hesaplama
6. **Tax Calendar** - Vergi takvimi

**Tüm hesaplamalar 2026 vergi dilimleri ile güncel.**

---

## 📧 EMAIL SİSTEMİ

### Resend Integration
**From:** emir@onderdenetim.com

**Otomatik Email'ler:**
- Welcome email (subscribers)
- Contact confirmation
- Admin notifications
- Blog notifications

**Kurulum:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
MAIL_FROM_EMAIL=emir@onderdenetim.com
```

---

## 🧪 TESTİNG

### Test Yapısı
```
tests/
├── unit/           # Unit testler
├── integration/    # Integration testler
│   ├── auth.test.js
│   └── calculators.test.js
└── e2e/           # End-to-end testler
```

### Test Çalıştırma
```bash
npm test                # Tüm testler
npm test:watch          # Watch mode
npm test:coverage       # Coverage raporu
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Kritik Adımlar

1. **MongoDB Setup**
   ```bash
   DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
   ```

2. **Redis Setup**
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

3. **Environment Variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=<32+ character secure secret>
   RESEND_API_KEY=<your-api-key>
   ```

4. **SSL/TLS**
   - Let's Encrypt sertifikası
   - HTTPS enforce
   - HSTS header

5. **Process Manager**
   ```bash
   pm2 start server.js -i max
   pm2 save
   ```

**Detaylı guide:** [PERFORMANCE_SECURITY_ANALYSIS.md](./PERFORMANCE_SECURITY_ANALYSIS.md)

---

## 🛠️ TROUBLESHOOTING

### Server başlamıyor
```bash
# Environment kontrol et
NODE_ENV=development node server.js

# Port kullanımda mı?
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

### Database bağlantı hatası
```bash
# MongoDB connection string kontrol
# Fallback: In-memory store otomatik aktif olur
```

### Email gönderilmiyor
```bash
# Resend API key kontrol
# Logs kontrol: tail -f logs/error.log
```

---

## 📞 DESTEK VE İLETİŞİM

**Email:** emir@onderdenetim.com
**Dokümantasyon:** Bu klasördeki dosyalar

---

## 📋 CHANGELOG

### v3.0.0 (13 Ocak 2026)
- ✨ API versioning sistemi (/api/v1)
- ✨ Advanced rate limiting (sliding window)
- ✨ Redis caching with fallback
- ✨ Comprehensive monitoring service
- ✨ CSRF protection (csrf-csrf)
- ✨ Complete CRUD operations
- ✨ Modular route structure
- 🔒 Security enhancements
- 📊 Performance optimizations
- 📚 Complete documentation

### v2.0.0 (Önceki versiyon)
- Blog management
- Contact form (TÜRMOB compliant)
- Calculators (2026 tax brackets)
- Email system
- Basic security
- JSON file database

---

## 📄 LİSANS

© 2026 Önder Denetim. All rights reserved.

---

**🎉 Backend production'a hazır!**

Detaylı teknik bilgi için diğer dokümantasyon dosyalarına bakınız.
