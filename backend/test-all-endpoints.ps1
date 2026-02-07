# BACKEND ENDPOINT TEST SCRIPT
# Tests all 40+ endpoints systematically

$baseUrl = "http://localhost:5000"
$token = ""
$results = @()

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [bool]$RequiresAuth = $false
    )

    Write-Host "`n[$Method] $Endpoint - $Description" -ForegroundColor Cyan

    try {
        $url = "$baseUrl$Endpoint"
        $allHeaders = @{"Content-Type" = "application/json"}

        if ($RequiresAuth -and $token) {
            $allHeaders["Authorization"] = "Bearer $token"
        }

        foreach ($key in $Headers.Keys) {
            $allHeaders[$key] = $Headers[$key]
        }

        $params = @{
            Uri = $url
            Method = $Method
            Headers = $allHeaders
            TimeoutSec = 10
        }

        if ($Body) {
            $params.Body = $Body
        }

        $response = Invoke-RestMethod @params -ErrorAction Stop

        Write-Host "✅ SUCCESS - Status: 200" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 3 -Compress | Select-Object -First 200)" -ForegroundColor Gray

        $script:results += [PSCustomObject]@{
            Method = $Method
            Endpoint = $Endpoint
            Description = $Description
            Status = "✅ PASS"
            StatusCode = 200
            RequiresAuth = $RequiresAuth
        }

        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message

        if ($statusCode -eq 401 -and $RequiresAuth -and !$token) {
            Write-Host "✅ PASS - Correctly requires auth (401)" -ForegroundColor Yellow
            $script:results += [PSCustomObject]@{
                Method = $Method
                Endpoint = $Endpoint
                Description = $Description
                Status = "✅ PASS (Auth Required)"
                StatusCode = 401
                RequiresAuth = $RequiresAuth
            }
        }
        elseif ($statusCode -eq 403 -and $RequiresAuth) {
            Write-Host "✅ PASS - Forbidden (403)" -ForegroundColor Yellow
            $script:results += [PSCustomObject]@{
                Method = $Method
                Endpoint = $Endpoint
                Description = $Description
                Status = "✅ PASS (Forbidden)"
                StatusCode = 403
                RequiresAuth = $RequiresAuth
            }
        }
        else {
            Write-Host "❌ FAIL - Status: $statusCode" -ForegroundColor Red
            Write-Host "Error: $errorMsg" -ForegroundColor Red
            $script:results += [PSCustomObject]@{
                Method = $Method
                Endpoint = $Endpoint
                Description = $Description
                Status = "❌ FAIL"
                StatusCode = $statusCode
                RequiresAuth = $RequiresAuth
            }
        }

        return $null
    }
}

Write-Host "================================" -ForegroundColor Magenta
Write-Host "BACKEND ENDPOINT TEST - START" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

# ============================================================================
# 1. PUBLIC ENDPOINTS (No Auth Required)
# ============================================================================

Write-Host "`n=== 1. SYSTEM & PUBLIC ENDPOINTS ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/health" -Description "Health Check"
Test-Endpoint -Method "GET" -Endpoint "/api-version" -Description "API Version"
Test-Endpoint -Method "GET" -Endpoint "/api/v1/blog" -Description "List Blogs (Public)"
Test-Endpoint -Method "GET" -Endpoint "/api/v1/blog?page=1&limit=5" -Description "List Blogs with Pagination"
Test-Endpoint -Method "GET" -Endpoint "/api/v1/regulations" -Description "List Regulations (Public)"
Test-Endpoint -Method "GET" -Endpoint "/api/v1/regulations?page=1&limit=5" -Description "List Regulations with Pagination"

# ============================================================================
# 2. AUTHENTICATION ENDPOINTS
# ============================================================================

Write-Host "`n=== 2. AUTHENTICATION ENDPOINTS ===" -ForegroundColor Yellow

$signinBody = @{
    email = "admin@onderdenetim.com"
    password = "admin123"
} | ConvertTo-Json

$authResponse = Test-Endpoint -Method "POST" -Endpoint "/api/v1/auth/signin" -Description "Admin Sign In" -Body $signinBody

if ($authResponse -and $authResponse.token) {
    $script:token = $authResponse.token
    Write-Host "`n🔑 Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green
}

if ($token) {
    $sessionBody = @{ token = $token } | ConvertTo-Json
    Test-Endpoint -Method "POST" -Endpoint "/api/v1/auth/session" -Description "Validate Session" -Body $sessionBody -RequiresAuth $true
}

# ============================================================================
# 3. BLOG ENDPOINTS (Protected)
# ============================================================================

Write-Host "`n=== 3. BLOG MANAGEMENT ENDPOINTS ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/blog" -Description "List All Blogs (Admin)" -RequiresAuth $true
Test-Endpoint -Method "GET" -Endpoint "/api/v1/blog/published" -Description "List Published Blogs" -RequiresAuth $false
Test-Endpoint -Method "GET" -Endpoint "/api/v1/blog/drafts" -Description "List Draft Blogs" -RequiresAuth $true

$newBlog = @{
    title = "Test Blog Post"
    content = "This is a test blog post content"
    excerpt = "Test excerpt"
    author = "Test Author"
    category = "Test"
    tags = @("test", "automation")
    status = "draft"
} | ConvertTo-Json

$createdBlog = Test-Endpoint -Method "POST" -Endpoint "/api/v1/blog" -Description "Create Blog Post" -Body $newBlog -RequiresAuth $true

if ($createdBlog -and $createdBlog.id) {
    $blogId = $createdBlog.id
    Test-Endpoint -Method "GET" -Endpoint "/api/v1/blog/$blogId" -Description "Get Single Blog" -RequiresAuth $false

    $updateBlog = @{
        title = "Updated Test Blog"
        content = "Updated content"
    } | ConvertTo-Json

    Test-Endpoint -Method "PUT" -Endpoint "/api/v1/blog/$blogId" -Description "Update Blog Post" -Body $updateBlog -RequiresAuth $true
    Test-Endpoint -Method "DELETE" -Endpoint "/api/v1/blog/$blogId" -Description "Delete Blog Post" -RequiresAuth $true
}

# ============================================================================
# 4. CALCULATORS ENDPOINTS (Public POST)
# ============================================================================

Write-Endpoint "`n=== 4. CALCULATOR ENDPOINTS ===" -ForegroundColor Yellow

$taxCalc = @{
    income = 100000
    year = 2025
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/calculators/income-tax" -Description "Income Tax Calculator" -Body $taxCalc

$vatCalc = @{
    amount = 1000
    rate = 18
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/calculators/vat" -Description "VAT Calculator" -Body $vatCalc

# ============================================================================
# 5. SUBSCRIBERS ENDPOINTS (Protected)
# ============================================================================

Write-Host "`n=== 5. SUBSCRIBERS MANAGEMENT ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/subscribers" -Description "List All Subscribers" -RequiresAuth $true

$newSubscriber = @{
    email = "test@example.com"
    name = "Test User"
    preferences = @{
        blog_updates = $true
        newsletter = $true
    }
} | ConvertTo-Json

$createdSubscriber = Test-Endpoint -Method "POST" -Endpoint "/api/v1/subscribers" -Description "Create Subscriber" -Body $newSubscriber -RequiresAuth $true

if ($createdSubscriber -and $createdSubscriber.id) {
    $subscriberId = $createdSubscriber.id
    Test-Endpoint -Method "GET" -Endpoint "/api/v1/subscribers/$subscriberId" -Description "Get Single Subscriber" -RequiresAuth $true
    Test-Endpoint -Method "DELETE" -Endpoint "/api/v1/subscribers/$subscriberId" -Description "Delete Subscriber" -RequiresAuth $true
}

# ============================================================================
# 6. UPLOAD ENDPOINTS (Protected) - NEW
# ============================================================================

Write-Host "`n=== 6. FILE UPLOAD ENDPOINTS (NEW) ===" -ForegroundColor Yellow

# Note: File upload requires multipart/form-data, testing route availability
Test-Endpoint -Method "GET" -Endpoint "/api/v1/upload" -Description "Upload endpoint availability check" -RequiresAuth $true

# ============================================================================
# 7. MAIL/EMAIL CAMPAIGN ENDPOINTS (Protected) - NEW
# ============================================================================

Write-Host "`n=== 7. EMAIL CAMPAIGN ENDPOINTS (NEW) ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/mail/campaigns/stats" -Description "Get Campaign Stats" -RequiresAuth $true

$testEmail = @{
    subject = "Test Email"
    content = "This is a test email"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/mail/send-test" -Description "Send Test Email" -Body $testEmail -RequiresAuth $true

# ============================================================================
# 8. SETTINGS/API ENDPOINTS (Protected, Admin Only) - NEW
# ============================================================================

Write-Host "`n=== 8. SETTINGS API ENDPOINTS (NEW) ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/settings/api" -Description "Get API Settings" -RequiresAuth $true

$apiSettings = @{
    resend = @{
        enabled = $true
        from_email = "test@onderdenetim.com"
    }
    general = @{
        auto_share_new_posts = $false
    }
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/settings/api" -Description "Update API Settings" -Body $apiSettings -RequiresAuth $true

# ============================================================================
# 9. SOCIAL MEDIA ENDPOINTS (Protected) - NEW
# ============================================================================

Write-Host "`n=== 9. SOCIAL MEDIA ENDPOINTS (NEW) ===" -ForegroundColor Yellow

$socialTest = @{
    platform = "linkedin"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/social/test" -Description "Test Social Platform" -Body $socialTest -RequiresAuth $true

$socialShare = @{
    content = "Test post"
    platforms = @("linkedin", "twitter")
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/social/share" -Description "Multi-Platform Share" -Body $socialShare -RequiresAuth $true
Test-Endpoint -Method "POST" -Endpoint "/api/v1/social/twitter" -Description "Twitter Share" -Body $socialShare -RequiresAuth $true
Test-Endpoint -Method "POST" -Endpoint "/api/v1/social/facebook" -Description "Facebook Share" -Body $socialShare -RequiresAuth $true

Test-Endpoint -Method "GET" -Endpoint "/api/v1/social/accounts" -Description "Get Social Accounts" -RequiresAuth $true
Test-Endpoint -Method "GET" -Endpoint "/api/v1/social/history" -Description "Get Share History" -RequiresAuth $true
Test-Endpoint -Method "GET" -Endpoint "/api/v1/social/stats" -Description "Get Social Stats" -RequiresAuth $true

# ============================================================================
# 10. CONTACT ENDPOINTS
# ============================================================================

Write-Host "`n=== 10. CONTACT MANAGEMENT ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/contact" -Description "List Contact Submissions" -RequiresAuth $true

$contactForm = @{
    name = "Test User"
    email = "test@example.com"
    subject = "Test Subject"
    message = "This is a test message"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/api/v1/contact" -Description "Submit Contact Form" -Body $contactForm

# ============================================================================
# 11. REGULATIONS ENDPOINTS (Protected)
# ============================================================================

Write-Host "`n=== 11. REGULATIONS MANAGEMENT ===" -ForegroundColor Yellow

$newRegulation = @{
    title = "Test Regulation"
    description = "Test Description"
    category = "Test Category"
    regulation_number = "TEST-001"
    regulation_date = "2025-01-14"
} | ConvertTo-Json

$createdRegulation = Test-Endpoint -Method "POST" -Endpoint "/api/v1/regulations" -Description "Create Regulation" -Body $newRegulation -RequiresAuth $true

if ($createdRegulation -and $createdRegulation.id) {
    $regId = $createdRegulation.id
    Test-Endpoint -Method "GET" -Endpoint "/api/v1/regulations/$regId" -Description "Get Single Regulation" -RequiresAuth $false
    Test-Endpoint -Method "DELETE" -Endpoint "/api/v1/regulations/$regId" -Description "Delete Regulation" -RequiresAuth $true
}

# ============================================================================
# 12. SYSTEM & MONITORING ENDPOINTS
# ============================================================================

Write-Host "`n=== 12. SYSTEM & MONITORING ===" -ForegroundColor Yellow

Test-Endpoint -Method "GET" -Endpoint "/api/v1/system/stats" -Description "System Statistics" -RequiresAuth $true
Test-Endpoint -Method "GET" -Endpoint "/api/v1/cache/stats" -Description "Cache Statistics" -RequiresAuth $true
Test-Endpoint -Method "GET" -Endpoint "/api/v1/monitoring/metrics" -Description "Monitoring Metrics" -RequiresAuth $true

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-Host "`n================================" -ForegroundColor Magenta
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

$totalTests = $results.Count
$passed = ($results | Where-Object { $_.Status -like "*PASS*" }).Count
$failed = ($results | Where-Object { $_.Status -like "*FAIL*" }).Count
$successRate = [math]::Round(($passed / $totalTests) * 100, 2)

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 75) { "Yellow" } else { "Red" })

Write-Host "`n=== DETAILED RESULTS ===" -ForegroundColor Yellow
$results | Format-Table -AutoSize

Write-Host "`nTest completed at: $(Get-Date)" -ForegroundColor Gray
