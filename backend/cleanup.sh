#!/bin/bash
# Backend Cleanup Script - Gereksiz Dosyaları Sil

echo "🧹 Backend Cleanup Başlayıyor..."
echo ""

# Root'taki gereksiz MD dosyalarını sil
echo "📄 Root MD dosyaları temizleniyor..."
rm -f PRODUCTION_README.md 2>/dev/null && echo "   ✓ PRODUCTION_README.md silindi"
rm -f PROJECT_COMPLETION.md 2>/dev/null && echo "   ✓ PROJECT_COMPLETION.md silindi"
rm -f README.md 2>/dev/null && echo "   ✓ README.md (root) silindi"
echo ""

# Eski verify scripts silindi
echo "🔍 Eski verification scripts siliniyor..."
rm -f verify.sh 2>/dev/null && echo "   ✓ verify.sh silindi"
rm -f verify.ps1 2>/dev/null && echo "   ✓ verify.ps1 silindi"
echo ""

# docs/ içindeki gereksiz dosyaları sil
echo "📚 docs/ içindeki gereksiz dosyalar temizleniyor..."
cd docs 2>/dev/null

rm -f FAZA_1_TAMAMLANDI.md 2>/dev/null && echo "   ✓ FAZA_1_TAMAMLANDI.md silindi"
rm -f NASIL_CALISTIRILIR.md 2>/dev/null && echo "   ✓ NASIL_CALISTIRILIR.md silindi"
rm -f QUICK_REFERENCE.md 2>/dev/null && echo "   ✓ QUICK_REFERENCE.md silindi"
rm -f ADMIN_API.md 2>/dev/null && echo "   ✓ ADMIN_API.md silindi"
rm -f ADMIN_SETUP.md 2>/dev/null && echo "   ✓ ADMIN_SETUP.md silindi"
rm -f ADMIN_PANEL_ANALIZ_VE_IYILESTIRME.md 2>/dev/null && echo "   ✓ ADMIN_PANEL_ANALIZ_VE_IYILESTIRME.md silindi"
rm -f API_DOCUMENTATION.md 2>/dev/null && echo "   ✓ API_DOCUMENTATION.md silindi"
rm -f FIGMA_SNIPPETS.md 2>/dev/null && echo "   ✓ FIGMA_SNIPPETS.md silindi"
rm -f FIXES_v2.0.0.md 2>/dev/null && echo "   ✓ FIXES_v2.0.0.md silindi"
rm -f BACKEND_COMPLETE_REPORT.md 2>/dev/null && echo "   ✓ BACKEND_COMPLETE_REPORT.md silindi"

cd .. 2>/dev/null
echo ""

echo "✅ Cleanup Tamamlandı!"
echo ""
echo "📊 Kalan docs/ dosyaları:"
ls -1 docs/ | grep ".md$" | wc -l
echo "adet dokumentasyon dosyası"
