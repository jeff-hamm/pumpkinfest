# Upload Existing Gallery Images to Google Drive

## Manual Upload (Recommended)

1. Open your Google Drive folder: https://drive.google.com/drive/folders/11kjpIv6IHcRa8lFLGiwwSJy9hyh4cYWN

2. Upload these images from the project folder:
   - `image copy.png`
   - `image copy 2.png` (header image)
   - `image copy 3.png`
   - `image copy 4.png`
   - `image copy 6.png`
   - `image copy 8.png`

3. After uploading, you can:
   - Rename them to more descriptive names
   - Organize them as needed
   - They'll automatically be available via the direct links

## Update Gallery Links (Optional)

If you want to reference the uploaded images in the gallery, you can:

1. Get the file IDs from the uploaded images
2. Update the HTML to use Google Drive links instead of local files
3. Format: `https://drive.google.com/uc?id=FILE_ID`

## Automated Upload Script (Advanced)

For future automation, you could use:

1. **Google Drive CLI tools** like `gdrive` or `rclone`
2. **Python script** with Google Drive API
3. **PowerShell script** with REST API calls

Example with rclone (after setup):
```bash
rclone copy "c:\OneDrive\Projects\Events\Pumpkinfest\*.png" gdrive:pumpkinfest-photos/
```

## Current Image Files

The following images are currently in the gallery:
- `image copy 2.png` - Header image (already moved to top of page)
- `image copy 4.png` - "An awesome pumpkin!"
- `image copy 6.png` - "The best possible pumpkin ever that our friend made!"
- `image copy 3.png` - Gallery image
- `image copy 8.png` - Gallery image  
- `image copy.png` - Gallery image

## Photo Upload System

The new photo upload system allows guests to:
- Upload photos directly through the RSVP form
- Photos go straight to the Google Drive folder
- No tracking in the spreadsheet (as requested)
- Photos appear in a shared gallery for everyone to enjoy

Once uploaded, all photos will be accessible at:
https://drive.google.com/drive/folders/11kjpIv6IHcRa8lFLGiwwSJy9hyh4cYWN