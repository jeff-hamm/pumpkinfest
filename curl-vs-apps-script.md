# Alternative: Upload via curl (Complex Setup Required)

## Why Apps Script is Better

Apps Script acts as an authenticated intermediary:
- JavaScript → Apps Script → Google Drive
- Apps Script runs with your Google account permissions
- No OAuth setup needed
- Built-in Google services access

## If You Really Want curl...

You'd need to:

### 1. Set up OAuth 2.0
```bash
# Get OAuth credentials from Google Cloud Console
# Set up OAuth flow
# Get access token
```

### 2. Upload via Google Drive API
```bash
# This is much more complex than our Apps Script approach
curl -X POST \
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: multipart/related; boundary=boundary' \
  --data-binary @- << EOF
--boundary
Content-Type: application/json

{
  "name": "pumpkin-photo.jpg",
  "parents": ["11kjpIv6IHcRa8lFLGiwwSJy9hyh4cYWN"]
}
--boundary
Content-Type: image/jpeg

[BINARY_IMAGE_DATA_HERE]
--boundary--
EOF
```

### 3. Handle Token Refresh
```bash
# Access tokens expire, need refresh logic
# Much more complex than Apps Script
```

## Recommended Approach

**Keep using Apps Script!** It's:
- ✅ Simpler to set up
- ✅ More secure (no tokens to manage)
- ✅ Built for Google Workspace integration
- ✅ Already working in your system

## Manual Upload for Existing Images

For the existing gallery images, manual upload is actually the most practical:

1. Go to: https://drive.google.com/drive/folders/11kjpIv6IHcRa8lFLGiwwSJy9hyh4cYWN
2. Drag and drop the 6 image files
3. Done in 30 seconds vs. hours of OAuth setup

## System Architecture

```
Guest Browser → Photo Upload → JavaScript (base64) → Apps Script → Google Drive
                                      ↓
Admin Browser → Manual Upload ────────────────────────→ Google Drive
                                      ↓
                               Both photos end up in same folder
```

Your current system is actually the optimal approach!