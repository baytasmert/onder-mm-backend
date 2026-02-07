# Backend Cleanup Script - Gereksiz Dosyaları Sil (PowerShell)

Write-Host "🧹 Backend Cleanup Başlayıyor..." -ForegroundColor Cyan
Write-Host ""

# Root'taki gereksiz MD dosyalarını sil
Write-Host "📄 Root MD dosyaları temizleniyor..." -ForegroundColor Yellow

$rootFiles = @(
    "PRODUCTION_README.md",
    "PROJECT_COMPLETION.md",
    "README.md"
)

foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ $file silindi" -ForegroundColor Green
    }
}

Write-Host ""

# Eski verify scripts sil
Write-Host "🔍 Eski verification scripts siliniyor..." -ForegroundColor Yellow

$verifyFiles = @(
    "verify.sh",
    "verify.ps1"
)

foreach ($file in $verifyFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ $file silindi" -ForegroundColor Green
    }
}

Write-Host ""

# docs/ içindeki gereksiz dosyaları sil
Write-Host "📚 docs/ içindeki gereksiz dosyalar temizleniyor..." -ForegroundColor Yellow

$docFiles = @(
    "docs/FAZA_1_TAMAMLANDI.md",
    "docs/NASIL_CALISTIRILIR.md",
    "docs/QUICK_REFERENCE.md",
    "docs/ADMIN_API.md",
    "docs/ADMIN_SETUP.md",
    "docs/ADMIN_PANEL_ANALIZ_VE_IYILESTIRME.md",
    "docs/API_DOCUMENTATION.md",
    "docs/FIGMA_SNIPPETS.md",
    "docs/FIXES_v2.0.0.md",
    "docs/BACKEND_COMPLETE_REPORT.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ $(Split-Path $file -Leaf) silindi" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Cleanup Tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Kalan docs/ dosyaları:" -ForegroundColor Cyan
$count = (Get-ChildItem docs -Filter "*.md" | Measure-Object).Count
Write-Host "$count adet dokumentasyon dosyası"
Write-Host ""
Get-ChildItem docs -Filter "*.md" | Select-Object Name | Format-Table
