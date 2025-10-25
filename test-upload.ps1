# PowerShell script to test photo upload via Apps Script
param(
    [string]$AppsScriptUrl,
    [string]$ImageFile = "image copy 4.png"
)

if (-not $AppsScriptUrl) {
    Write-Host "Usage: .\test-upload.ps1 -AppsScriptUrl 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'" -ForegroundColor Red
    exit 1
}

Write-Host "Testing photo upload to Apps Script..." -ForegroundColor Green

# Convert image to base64
Write-Host "Converting image to base64..." -ForegroundColor Yellow
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ImageFile))

# Create request body
$requestBody = @{
    action = "uploadPhoto"
    filename = "curl-test-upload.png"
    fileData = $base64
    mimeType = "image/png"
} | ConvertTo-Json -Compress

Write-Host "Sending request to Apps Script..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $AppsScriptUrl -Method POST -ContentType "application/json" -Body $requestBody
    
    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Content:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        try {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            $errorText = $reader.ReadToEnd()
            Write-Host "Error Response: $errorText" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
}