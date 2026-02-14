# Harici Entegrasyon Rehberi

Önder Denetim Backend - Harici servis kurulum ve yapılandırma dokümantasyonu.

---

## Genel Bakış

| Servis | Paket | Zorunlu mu? | Fallback | Maliyet |
|--------|-------|:-----------:|----------|---------|
| MongoDB | `mongodb` | Production'da evet | In-memory Map | Ücretsiz (Atlas M0) |
| Resend | `resend` | Production'da evet | Simülasyon (log) | Ücretsiz (3K email/ay) |
| Redis | `ioredis` | Hayır | In-memory Map (500 item) | Ücretsiz (Upstash) |
| LinkedIn API | native `fetch` | Hayır | Özellik devre dışı | Ücretsiz |
| Instagram API | native `fetch` | Hayır | Özellik devre dışı | Ücretsiz |

Tüm ayarlar `.env` dosyasından yapılır. Kod değişikliği gerekmez.

---

## 1. MongoDB (Veritabanı)

Şu an sunucu in-memory çalışıyor — **sunucu her kapandığında tüm veri kaybolur**.
Kalıcı veri için MongoDB bağlantısı gereklidir.

### Seçenek A: MongoDB Atlas (Ücretsiz, Tavsiye Edilen)

1. **Hesap aç**: https://mongodb.com/atlas → ücretsiz kayıt
2. **Cluster oluştur**: "Build a Cluster" → **M0 Free Tier** seç (512MB, ücretsiz)
   - Region: **Frankfurt (eu-central-1)** — Türkiye'ye en yakın
3. **Veritabanı kullanıcısı ekle**:
   - Database Access → Add Database User
   - Kullanıcı adı ve şifre belirle (şifrede `@`, `#`, `/` gibi özel karakterler kullanma)
4. **Ağ erişimi ayarla**:
   - Network Access → Add IP Address
   - Geliştirme için: `0.0.0.0/0` (her yerden erişim)
   - Production için: sadece sunucu IP'ni ekle
5. **Bağlantı string'ini al**:
   - Connect → "Connect your application" → Driver: Node.js
   - String'i kopyala

6. **`.env` dosyasına ekle**:
```env
DATABASE_URL=mongodb+srv://kullanici:sifre@cluster0.xxxxx.mongodb.net/onderdenetim?retryWrites=true&w=majority
```

7. Sunucuyu yeniden başlat.

### Seçenek B: Lokal MongoDB

```bash
# Windows - MongoDB Community Server indir ve kur:
# https://www.mongodb.com/try/download/community

# Kurulumdan sonra .env dosyasına ekle:
DATABASE_URL=mongodb://localhost:27017/onderdenetim
```

### Seçenek C: Docker ile MongoDB

```bash
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=sifre123 \
  mongo:7
```
```env
DATABASE_URL=mongodb://admin:sifre123@localhost:27017/onderdenetim?authSource=admin
```

### Doğrulama

Sunucu logunda şunu görmelisin:
```
📊 Database: Connecting to MongoDB...
✅ MongoDB connected successfully
```

Göremiyorsan:
- Bağlantı string'ini kontrol et
- Network Access'te IP'nin ekli olduğundan emin ol
- Kullanıcı adı/şifre doğruluğunu kontrol et

### Koleksiyonlar (Otomatik Oluşturulur)

| Koleksiyon | Açıklama |
|------------|----------|
| `admins` | Yönetici hesapları |
| `blogPosts` | Blog yazıları |
| `subscribers` | E-bülten aboneleri |
| `contacts` | İletişim form mesajları |
| `regulations` | Mevzuat yazıları |
| `logs` | Aktivite logları |
| `mailCampaigns` | Email kampanya geçmişi |
| `analytics_event` | Analitik olayları |
| `setting:*` | Site ayarları |
| `socialAccounts` | Sosyal medya hesapları |

### İlgili Dosyalar

- `backend/db.js` — Veritabanı soyutlama katmanı
- `backend/db-mongodb.js` — MongoDB adapter

---

## 2. Resend (Email Servisi)

Email bildirimleri, bülten gönderimi ve iletişim yanıtları için kullanılır.

### Kurulum

1. **Hesap aç**: https://resend.com → ücretsiz kayıt (ayda 3.000 email ücretsiz)
2. **API Key oluştur**: Dashboard → API Keys → "Create API Key"
3. Key'i kopyala (`re_` ile başlar)

4. **`.env` dosyasına ekle**:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM_EMAIL=noreply@onderdenetim.com
MAIL_FROM_NAME=Önder Denetim
ADMIN_EMAIL=emir@onderdenetim.com
```

### Domain Doğrulama (Production için Zorunlu)

Domain doğrulanmadan sadece `onboarding@resend.dev` adresinden email gönderebilirsin.
Production'da kendi domaininden göndermek için:

1. Resend Dashboard → **Domains** → "Add Domain" → `onderdenetim.com`
2. Verilen DNS kayıtlarını domain sağlayıcına ekle:
   - **MX** kaydı
   - **TXT** kaydı (SPF)
   - **CNAME** kayıtları (DKIM)
3. "Verify" butonuna bas → DNS yayılımı 5dk-48 saat sürebilir
4. Doğrulandıktan sonra `noreply@onderdenetim.com` adresi çalışır

### Email Fonksiyonları

| Fonksiyon | Tetikleyici | Alıcı |
|-----------|-------------|-------|
| `sendWelcomeEmail` | Yeni abone kaydı | Abone |
| `sendBlogNotification` | Blog yayınlanma | Tüm aboneler |
| `sendRegulationNotification` | Mevzuat yayınlanma | Tüm aboneler |
| `sendContactAutoResponse` | İletişim formu | Form gönderen |
| `sendContactNotificationToAdmin` | İletişim formu | Admin |
| `sendContactReply` | Admin yanıtı | Form gönderen |
| `sendCustomCampaign` | Manuel kampanya | Seçilen aboneler |

### Doğrulama

```bash
# İletişim formu gönder — admin emaile bildirim gelecek
curl -X POST http://localhost:5000/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Merhaba","kvkk_consent":true}'
```

### İlgili Dosyalar

- `backend/src/services/mailService.js` — Tüm email fonksiyonları ve şablonlar
- `backend/src/config/index.js` → `config.email` — Email yapılandırması

---

## 3. Redis (Cache — Opsiyonel)

Yüksek performanslı önbellekleme katmanı. Küçük-orta ölçekte **gereksiz** —
in-memory fallback çoğu durumda yeterlidir.

### Ne Zaman Gerekir?

- Günlük 10.000+ sayfa görüntüleme
- Aynı anda 100+ aktif kullanıcı
- API yanıt süresi < 50ms hedefi

### Seçenek A: Upstash (Ücretsiz, Serverless)

1. **Hesap aç**: https://upstash.com → ücretsiz kayıt (günlük 10.000 komut ücretsiz)
2. **Veritabanı oluştur**: "Create Database" → Region: **Frankfurt**
3. Connection string'i kopyala

```env
REDIS_URL=rediss://default:xxxxxxxxxxxx@eu-central-1.upstash.io:6379
```

### Seçenek B: Docker ile Redis

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```
```env
REDIS_URL=redis://localhost:6379
```

### Seçenek C: Kullanma

`.env` dosyasında `REDIS_URL=` boş bırak — otomatik olarak in-memory cache kullanır (max 500 item, LRU eviction).

### Cache TTL Değerleri

| Veri Tipi | TTL | Açıklama |
|-----------|-----|----------|
| Blog yazısı | 5 dk | Tekil blog detayı |
| Blog listesi | 1 dk | Blog listesi sayfası |
| Mevzuatlar | 5 dk | Mevzuat detayı |
| Hesap makineleri | 1 saat | Hesaplama sonuçları |
| İstatistikler | 1 dk | Dashboard verileri |
| Vergi takvimi | 24 saat | Sabit vergi tarihleri |

### İlgili Dosyalar

- `backend/src/services/cacheService.js` — Cache servisi

---

## 4. LinkedIn API (Opsiyonel)

Blog yazılarını otomatik olarak LinkedIn şirket sayfasında paylaşmak için kullanılır.

### Kurulum

1. **LinkedIn Developer Portal**: https://linkedin.com/developers → uygulama oluştur
2. **Products** sekmesinde şunları ekle:
   - "Share on LinkedIn"
   - "Sign In with LinkedIn using OpenID Connect"
3. **Auth** sekmesinden:
   - Client ID al
   - Redirect URI ekle: `https://onderdenetim.com/api/v1/social/linkedin/callback`
4. **Şirket sayfası ID'sini bul**:
   - LinkedIn şirket sayfası URL'si: `linkedin.com/company/12345678`
   - ID: `12345678`
5. **Access Token almak için** backend'deki OAuth endpoint'ini kullan:
   ```
   GET /api/v1/social/linkedin/auth?redirect_uri=https://onderdenetim.com/callback
   ```
   Bu endpoint OAuth yetkilendirme URL'sini döner. Kullanıcı yetkilendirme verdikten sonra access token alınır.

6. **`.env` dosyasına ekle**:
```env
LINKEDIN_ACCESS_TOKEN=AQV...
LINKEDIN_ORGANIZATION_ID=12345678
LINKEDIN_CLIENT_ID=77xxxxxxxx
```

### API Kullanımı

```bash
# Blog yazısını LinkedIn'de paylaş
curl -X POST http://localhost:5000/api/v1/social/blog/{blogId}/post \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"platforms":["linkedin"]}'
```

### Notlar

- Access token'lar 60 gün geçerlidir, yenilenmesi gerekir
- Organization ID, kişisel profil ID'si değildir — şirket sayfası ID'sidir
- Şirket sayfası admin yetkisi gereklidir

### İlgili Dosyalar

- `backend/src/controllers/socialMediaController.js` — Paylaşım fonksiyonları
- `backend/src/controllers/socialMediaIntegrationController.js` — OAuth ve hesap yönetimi

---

## 5. Instagram (Facebook Graph API — Opsiyonel)

Blog içeriklerini Instagram Business hesabında paylaşmak için kullanılır.

### Ön Koşullar

- Instagram **Business** hesabı (kişisel hesap çalışmaz)
- Facebook sayfasına bağlı olmalı
- Facebook Developer hesabı

### Kurulum

1. **Facebook Developer Portal**: https://developers.facebook.com → uygulama oluştur
2. **Instagram Graph API** product'ını ekle
3. **Business hesap ID'sini bul**:
   - Graph API Explorer: `GET /me/accounts` → sayfa ID'sini al
   - Sayfa ID ile: `GET /{page-id}?fields=instagram_business_account`
   - Business Account ID'yi al
4. **Access Token al**:
   - Graph API Explorer'dan uzun süreli token oluştur
   - Veya backend'deki OAuth endpoint'ini kullan:
     ```
     GET /api/v1/social/instagram/auth?redirect_uri=https://onderdenetim.com/callback
     ```

5. **`.env` dosyasına ekle**:
```env
INSTAGRAM_ACCESS_TOKEN=IGQV...
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000
INSTAGRAM_CLIENT_ID=xxxxx
```

### Kısıtlamalar

- Sadece **görsel** paylaşımı desteklenir (text-only post yok)
- Görsel URL'si erişilebilir olmalı (public URL)
- Günlük paylaşım limiti: 25 post
- Token süresi: 60 gün (yenilenmesi gerekir)

### İlgili Dosyalar

- `backend/src/controllers/socialMediaController.js` — Paylaşım fonksiyonları
- `backend/src/controllers/socialMediaIntegrationController.js` — OAuth ve hesap yönetimi

---

## 6. Twitter/X ve Facebook

Henüz tam olarak implemente edilmemiştir. Sadece placeholder kod mevcuttur.

```env
# Gelecekte eklenecek
TWITTER_CLIENT_ID=
FACEBOOK_APP_ID=
```

---

## Hızlı Başlangıç

### Minimum Kurulum (Geliştirme)

Hiçbir şey yapma — sunucu in-memory modda çalışır. Email simüle edilir.

### Minimum Kurulum (Production)

`.env` dosyasında şu 2 satırı doldur:

```env
DATABASE_URL=mongodb+srv://user:pass@cluster0.xxx.mongodb.net/onderdenetim
RESEND_API_KEY=re_xxxxxxxxxx
```

### Tam Kurulum (Production + Performans + Sosyal Medya)

```env
# Zorunlu
NODE_ENV=production
PORT=5000
JWT_SECRET=en-az-32-karakter-guclu-rastgele-deger
DATABASE_URL=mongodb+srv://user:pass@cluster0.xxx.mongodb.net/onderdenetim
RESEND_API_KEY=re_xxxxxxxxxx
DEFAULT_ADMIN_EMAIL=admin@onderdenetim.com
DEFAULT_ADMIN_PASSWORD=guclu-sifre
ALLOWED_ORIGINS=https://onderdenetim.com
FRONTEND_URL=https://onderdenetim.com

# Önerilen
REDIS_URL=rediss://default:xxx@eu-central-1.upstash.io:6379
ADMIN_EMAIL=bildirim@onderdenetim.com
MAIL_FROM_EMAIL=noreply@onderdenetim.com
MAIL_FROM_NAME=Önder Denetim

# Opsiyonel — Sosyal Medya
LINKEDIN_ACCESS_TOKEN=AQV...
LINKEDIN_ORGANIZATION_ID=12345678
INSTAGRAM_ACCESS_TOKEN=IGQV...
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000
```

---

## Sorun Giderme

### MongoDB bağlanmıyor
- `DATABASE_URL` formatını kontrol et (`mongodb://` veya `mongodb+srv://`)
- Atlas kullanıyorsan Network Access'te IP'ni ekle
- Şifrede özel karakter varsa URL-encode et (`@` → `%40`)

### Email gönderilmiyor
- `RESEND_API_KEY` doğru mu kontrol et
- Domain doğrulanmadıysa sadece `onboarding@resend.dev`'den gönderebilirsin
- Resend Dashboard → Logs'tan hata detayını gör

### Redis bağlanmıyor
- Zararsız — otomatik olarak in-memory cache'e düşer
- `REDIS_URL` formatı: `redis://localhost:6379` veya `rediss://...` (TLS)

### Sosyal medya paylaşımı çalışmıyor
- Access token'ın süresi dolmuş olabilir (60 gün)
- LinkedIn: Şirket sayfası admin yetkisi gerekli
- Instagram: Sadece görsel paylaşımı desteklenir

---

## Dosya Haritası

```
backend/
├── .env                              # Tüm entegrasyon ayarları
├── db.js                             # Veritabanı soyutlama katmanı
├── db-mongodb.js                     # MongoDB adapter
├── src/
│   ├── config/index.js               # Merkezi yapılandırma
│   ├── services/
│   │   ├── mailService.js            # Resend email entegrasyonu
│   │   └── cacheService.js           # Redis cache entegrasyonu
│   └── controllers/
│       ├── socialMediaController.js           # LinkedIn/Instagram paylaşım
│       └── socialMediaIntegrationController.js # OAuth yönetimi
```
