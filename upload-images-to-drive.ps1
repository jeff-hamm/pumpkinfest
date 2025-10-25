# Upload images to Google Drive via Apps Script
# Excludes "image copy 2.png" as requested

$appsScriptUrl = "https://script.google.com/macros/s/AKfycbxBH_e8mEHCqDrv-LlhkAaN3IM3jEXrVt4RerOufh7fTXKuMzZBGY2rzdqZUqnrL_9U/exec"

# Get all image files except the excluded one
$imageFiles = Get-ChildItem -Path "." -Include "*.jpg","*.jpeg","*.png","*.gif","*.webp" -Recurse | Where-Object { $_.Name -ne "image copy 2.png" }

Write-Host "Found $($imageFiles.Count) images to upload (excluding 'image copy 2.png')"
Write-Host ""

foreach ($file in $imageFiles) {
    Write-Host "Uploading: $($file.Name)" -ForegroundColor Yellow
    
    try {
        # Read file as bytes and convert to base64
        $fileBytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $base64String = [System.Convert]::ToBase64String($fileBytes)
        
        # Determine MIME type
        $mimeType = switch ($file.Extension.ToLower()) {
            '.png' { 'image/png' }
            '.jpg' { 'image/jpeg' }
            '.jpeg' { 'image/jpeg' }
            '.gif' { 'image/gif' }
            '.webp' { 'image/webp' }
            default { 'image/png' }
        }
        
        # Create JSON payload
        $payload = @{
            action = "uploadPhoto"
            filename = $file.Name
            fileData = $base64String
            mimeType = $mimeType
        } | ConvertTo-Json -Depth 3
        
        # Upload to Apps Script
        $response = Invoke-RestMethod -Uri $appsScriptUrl -Method Post -Body $payload -ContentType "application/json"
        
        if ($response.success) {
            Write-Host "  ✅ Successfully uploaded: $($file.Name)" -ForegroundColor Green
            Write-Host "  📁 Drive URL: $($response.data.driveUrl)" -ForegroundColor Cyan
            Write-Host "  🔗 Direct URL: $($response.data.directUrl)" -ForegroundColor Cyan
        } else {
            Write-Host "  ❌ Upload failed: $($response.error)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "  ❌ Error uploading $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1  # Small delay to avoid overwhelming the API
}

Write-Host "Upload process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Testing gallery retrieval..." -ForegroundColor Yellow

# Test gallery retrieval
try {
    $galleryResponse = Invoke-RestMethod -Uri "$appsScriptUrl?action=getGalleryImages" -Method Get
    
    if ($galleryResponse.success) {
        Write-Host "✅ Gallery now contains $($galleryResponse.data.count) images:" -ForegroundColor Green
        foreach ($image in $galleryResponse.data.images) {
            Write-Host "  - $($image.name)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Failed to retrieve gallery: $($galleryResponse.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error retrieving gallery: $($_.Exception.Message)" -ForegroundColor Red
}