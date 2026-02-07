# 🚀 Backend Başlangıç Rehberi
## Önder Denetim - Backend Kurulum ve Çalıştırma

**Son Güncelleme:** 2024-02-07

---

## 📋 İçindekiler

1. [Ön Gereksinimler](#ön-gereksinimler)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Detaylı Kurulum](#detaylı-kurulum)
4. [Backend'i Çalıştırma](#backendi-çalıştırma)
5. [Backend'i Durdurma](#backendi-durdurma)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Test Etme](#test-etme)
8. [Sorun Giderme](#sorun-giderme)

---

## 📌 Ön Gereksinimler

### Gerekli Yazılımlar:

1. **Node.js** (v18 veya üzeri)
   - İndirmek için: https://nodejs.org/
   - Kontrol et: `node --version`

2. **npm** (Node.js ile birlikte gelir)
   - Kontrol et: `npm --version`

3. **Git** (opsiyonel, proje indirmek için)
   - İndirmek için: https://git-scm.com/

---

## ⚡ Hızlı Başlangıç

### Windows için (Şu An Kullandığınız):

```bash
# 1. Backend klasörüne git
cd "C:\Users\Asus\Downloads\onder_mm_website\backend"

# 2. Paketleri yükle (sadece ilk seferde)
npm install

# 3. Backend'i başlat
npm start
```

**İşte bu kadar!** Backend şimdi çalışıyor: http://localhost:5000

---

## 🔧 Detaylı Kurulum

### Adım 1: Proje Klasörüne Git

**Windows CMD:**
```cmd
cd C:\Users\Asus\Downloads\onder_mm_website\backend
```

**Windows PowerShell:**
```powershell
cd "C:\Users\Asus\Downloads\onder_mm_website\backend"
```

**Git Bash (Windows):**
```bash
cd /c/Users/Asus/Downloads/onder_mm_website/backend
```

### Adım 2: Paketleri Yükle

İlk kez çalıştırıyorsanız veya `package.json` değiştiyse:

```bash
npm install
```

**Bu komut:**
- ✅ Tüm bağımlılıkları indirir
- ✅ `node_modules` klasörünü oluşturur
- ✅ Yaklaşık 1-2 dakika sürer

**Çıktı:**
```
added 250 packages, and audited 251 packages in 45s
```

### Adım 3: Ortam Değişkenlerini Kontrol Et

`.env` dosyası zaten mevcut! Kontrol edelim:

```bash
# Windows
type .env

# Linux/Mac
cat .env
```

**Minimum gerekli ayarlar (zaten yapılmış):**
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=dev-secret-key-min-32-chars-long-for-development-only-change-in-prod
DEFAULT_ADMIN_EMAIL=mertbaytas@gmail.com
DEFAULT_ADMIN_PASSWORD=eR4SmOusSe41.G1D3K
```

---

## 🚀 Backend'i Çalıştırma

### Yöntem 1: Normal Mod (Tavsiye Edilen)

```bash
npm start
```

**Ne yapar:**
- ✅ Server'ı başlatır
- ✅ Port 5000'de dinler
- ✅ Ctrl+C ile durur

**Çıktı:**
```
🚀 ═══════════════════════════════════════════════════
🚀 ÖNDER DENETİM BACKEND SERVER
🚀 ═══════════════════════════════════════════════════

═══════════════════════════════════════════════════
🚀 Server: http://localhost:5000
📍 Environment: development
═══════════════════════════════════════════════════

🗄️  Database: In-Memory Store
[INIT] ✅ Default admin created successfully
✅ All services initialized
```

### Yöntem 2: Development Mod (Otomatik Yeniden Başlatma)

```bash
npm run dev
```

**Avantajları:**
- ✅ Kod değişince otomatik yeniden başlar
- ✅ Geliştirme için ideal
- ✅ `--watch` flag kullanır

### Yöntem 3: Arka Planda Çalıştırma (Windows)

**PowerShell:**
```powershell
Start-Process npm -ArgumentList "start" -WindowStyle Hidden
```

**CMD:**
```cmd
start /B npm start
```

### Yöntem 4: Production Modu

```bash
npm run start:production
```

Veya manuel:
```bash
set NODE_ENV=production
npm start
```

---

## 🛑 Backend'i Durdurma

### Yöntem 1: Terminal'de Çalışıyorsa

**Windows/Linux/Mac:**
```
Ctrl + C
```

### Yöntem 2: Port'u Kullanıyor Başka Bir Process

**Windows PowerShell (Port 5000'i kapat):**
```powershell
# Port 5000'i kullanan process'i bul
netstat -ano | findstr :5000

# Çıkan PID numarasını not al (örnek: 12345)
# Sonra o process'i kapat
taskkill /PID 12345 /F
```

**Tek komutla (PowerShell):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### Yöntem 3: npm Script ile

```bash
# package.json'a eklenebilir
npm run stop
```

---

## 🔐 Ortam Değişkenleri

### `.env` Dosyası Yapılandırması

Backend klasöründe `.env` dosyası zaten var. İşte önemli ayarlar:

```env
# ============================================
# TEMEL AYARLAR
# ============================================
NODE_ENV=development                    # development | production
PORT=5000                               # Server portu

# ============================================
# GÜVENLİK
# ============================================
JWT_SECRET=dev-secret-key...           # Production'da değiştir!
JWT_EXPIRES_IN=7d                       # Token geçerlilik süresi

# ============================================
# DEFAULT ADMIN
# ============================================
DEFAULT_ADMIN_EMAIL=mertbaytas@gmail.com
DEFAULT_ADMIN_PASSWORD=eR4SmOusSe41.G1D3K
DEFAULT_ADMIN_NAME=Site Yöneticisi

# ============================================
# DATABASE (Opsiyonel)
# ============================================
# Boş bırakılırsa: In-Memory Store kullanılır
# MongoDB için: mongodb://localhost:27017/onderdenetim
DATABASE_URL=

# ============================================
# REDIS CACHE (Opsiyonel)
# ============================================
# Boş bırakılırsa: Memory cache kullanılır
# Redis için: redis://localhost:6379
REDIS_URL=

# ============================================
# EMAIL SERVİSİ (Opsiyonel)
# ============================================
RESEND_API_KEY=                        # Resend API key
MAIL_FROM_EMAIL=noreply@onderdenetim.com
MAIL_FROM_NAME=Önder Denetim
ADMIN_EMAIL=emir@onderdenetim.com

# ============================================
# SOSYAL MEDYA (Opsiyonel)
# ============================================
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_ID=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=

# ============================================
# CORS
# ============================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# ============================================
# DOSYA YÜKLEME
# ============================================
MAX_FILE_SIZE=10485760                 # 10MB
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,image/gif,application/pdf
```

### Önemli Notlar:

⚠️ **Production'a geçerken:**
1. `JWT_SECRET` değiştirin (min 32 karakter)
2. `DEFAULT_ADMIN_PASSWORD` değiştirin
3. `NODE_ENV=production` yapın
4. `DATABASE_URL` ekleyin (MongoDB)
5. `REDIS_URL` ekleyin (performans için)

---

## ✅ Test Etme

### 1. Health Check

**Browser'da:**
```
http://localhost:5000/api/v1/health
```

**cURL ile:**
```bash
curl http://localhost:5000/api/v1/health
```

**Başarılı Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-02-07T13:00:00.000Z",
  "version": "3.0.0"
}
```

### 2. Admin Login Testi

```bash
curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mertbaytas@gmail.com\",\"password\":\"eR4SmOusSe41.G1D3K\"}"
```

**Başarılı Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "mertbaytas@gmail.com",
    "name": "Site Yöneticisi",
    "role": "admin"
  }
}
```

### 3. Blog Listesi (Public)

```bash
curl http://localhost:5000/api/v1/blog
```

### 4. Tüm Endpoint'leri Test Et

PowerShell script mevcut:
```bash
.\test-all-endpoints.ps1
```

---

## 🐛 Sorun Giderme

### Problem 1: "Port already in use"

**Hata:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Çözüm:**
```powershell
# Port'u kullanan process'i bul ve kapat
netstat -ano | findstr :5000
taskkill /PID [PID_NUMARASI] /F

# Veya farklı port kullan
set PORT=5001
npm start
```

### Problem 2: "Cannot find module"

**Hata:**
```
Error: Cannot find module 'express'
```

**Çözüm:**
```bash
# node_modules'u sil ve tekrar yükle
rm -rf node_modules package-lock.json
npm install
```

### Problem 3: "JWT_SECRET not configured"

**Hata:**
```
Warning: JWT_SECRET not configured
```

**Çözüm:**
`.env` dosyasını kontrol et, `JWT_SECRET` var mı?
```bash
type .env | findstr JWT_SECRET
```

### Problem 4: "Permission denied" (Linux/Mac)

**Çözüm:**
```bash
# Port 80 veya 443 kullanıyorsanız
sudo npm start

# Veya farklı port kullanın (1024+)
PORT=3000 npm start
```

### Problem 5: Backend başlamıyor

**Debug modu ile başlat:**
```bash
set DEBUG=*
npm start
```

**Log'ları kontrol et:**
```bash
cat logs/app.log
```

---

## 📊 Backend Durumunu Kontrol Et

### Çalışıyor mu?

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:5000/api/v1/health
```

### Hangi Port'ta Çalışıyor?

```bash
# Windows
netstat -ano | findstr :5000

# Aktif bağlantıları göster
netstat -ano | findstr LISTENING | findstr :5000
```

### Process ID'yi Bul

```bash
# Windows
netstat -ano | findstr :5000
# En sondaki sayı PID

# Linux/Mac
lsof -i :5000
```

---

## 🔄 Güncelleme ve Yeniden Başlatma

### Kod Değişikliği Sonrası

**Development mode:**
```bash
npm run dev
# Otomatik yeniden başlar
```

**Production mode:**
```bash
# Backend'i durdur (Ctrl+C)
# Tekrar başlat
npm start
```

### Paket Güncelleme

```bash
# Tüm paketleri güncelle
npm update

# Güvenlik açıklarını kontrol et
npm audit

# Güvenlik açıklarını düzelt
npm audit fix
```

---

## 📱 Farklı Ortamlarda Çalıştırma

### Development (Yerel Geliştirme)

```bash
npm run dev
```
- Auto-reload aktif
- Verbose logging
- In-memory database
- Relaxed security

### Production (Canlı Sunucu)

```bash
NODE_ENV=production npm start
```
- Auto-reload kapalı
- Minimal logging
- MongoDB database
- Strict security
- Rate limiting aktif

### Test (Otomatik Testler)

```bash
npm test
```

---

## 🎯 Hızlı Komutlar Özeti

| Komut | Açıklama |
|-------|----------|
| `npm install` | Paketleri yükle (ilk kurulum) |
| `npm start` | Backend'i başlat (normal) |
| `npm run dev` | Backend'i başlat (auto-reload) |
| `Ctrl+C` | Backend'i durdur |
| `npm test` | Testleri çalıştır |
| `npm run test:watch` | Testleri izleme modunda çalıştır |
| `npm audit` | Güvenlik kontrolü |
| `npm update` | Paketleri güncelle |

---

## 🌐 URL'ler ve Endpoint'ler

**Backend Base URL:**
```
http://localhost:5000
```

**API Base URL:**
```
http://localhost:5000/api/v1
```

**Önemli Endpoint'ler:**
- Health: `/api/v1/health`
- Login: `/api/v1/auth/signin`
- Blog: `/api/v1/blog`
- Admin: `/api/v1/admin`

**Tam liste için:**
- `backend/docs/API_DOCUMENTATION.md`

---

## 🔐 Güvenlik Notları

### Development'ta:
✅ Default şifreler kullanabilirsiniz
✅ HTTP kullanabilirsiniz
✅ CORS açık olabilir

### Production'da:
⚠️ **MUTLAKA DEĞİŞTİRİN:**
1. `JWT_SECRET` - Güçlü, rastgele, 32+ karakter
2. `DEFAULT_ADMIN_PASSWORD` - Güçlü şifre
3. `NODE_ENV=production`
4. HTTPS kullanın
5. CORS'u sadece domain'inizle sınırlayın
6. Rate limiting ayarlarını gözden geçirin
7. Firewall kuralları ekleyin

---

## 📞 Yardım ve Destek

**Dökümantasyon:**
- `/backend/docs/API_DOCUMENTATION.md` - API referansı
- `/backend/docs/IMPLEMENTATION_SUMMARY.md` - Sistem özeti
- `/backend/docs/FINAL_CHECKLIST.md` - Özellik listesi

**Log Dosyaları:**
- `/backend/logs/app.log` - Uygulama logları
- `/backend/logs/error.log` - Hata logları

**Test Scriptleri:**
- `/backend/test-all-endpoints.ps1` - Tüm endpoint'leri test et

---

## ✅ Başarı Kontrolü

Backend başarıyla çalışıyorsa şunları görmelisiniz:

```
✅ Server başladı: http://localhost:5000
✅ Health check çalışıyor
✅ Admin login başarılı
✅ Database bağlantısı var
✅ Log'larda hata yok
```

**Test edin:**
```bash
# 1. Health check
curl http://localhost:5000/api/v1/health

# 2. Login
curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"mertbaytas@gmail.com\",\"password\":\"eR4SmOusSe41.G1D3K\"}"
```

Her ikisi de başarılı response veriyorsa: **🎉 Backend hazır!**

---

**Son Güncelleme:** 2024-02-07
**Backend Version:** 2.0.0
**Hazırlayan:** Claude Sonnet 4.5
