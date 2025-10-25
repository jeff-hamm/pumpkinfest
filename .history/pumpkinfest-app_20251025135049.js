/**
 * Pumpkinfest 2025 RSVP System - v2025-10-25-5
 * Based on the Google Sheets Checklist architecture
 * Increased file upload limit to 10MB for better photo support
 */

class PumpkinfestRSVP {
    constructor(config = {}) {
        // Configuration
        const defaultConfig = {
            sheetId: '1XEfcdwvrg54w_Aw8bEiBC4_f8pLJOT6bH55sau92mvg', // Your Pumpkinfest 2025 sheet
            gid: '0', // First sheet
            appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxBH_e8mEHCqDrv-LlhkAaN3IM3jEXrVt4RerOufh7fTXKuMzZBGY2rzdqZUqnrL_9U/exec', // Your deployed Apps Script
            refreshInterval: 30000, // 30 seconds
            maxRetries: 3
        };

        // Merge configurations
        const finalConfig = {
            ...defaultConfig,
            ...(window.PUMPKINFEST_CONFIG || {}),
            ...config
        };

        // Apply configuration
        this.sheetId = finalConfig.sheetId;
        this.gid = finalConfig.gid;
        this.appsScriptUrl = finalConfig.appsScriptUrl;
        this.refreshInterval = finalConfig.refreshInterval;
        this.maxRetries = finalConfig.maxRetries;

        // State
        this.rsvps = [];
        this.lastModified = null;
        this.useAppsScript = this.appsScriptUrl && this.appsScriptUrl !== 'YOUR_APPS_SCRIPT_URL_HERE';
        this.currentFilter = 'Everyone';

        // Initialize
        this.init();
    }

    init() {
        console.log('Initializing Pumpkinfest RSVP system...');
        console.log('Apps Script URL:', this.appsScriptUrl);
        console.log('Use Apps Script:', this.useAppsScript);

        // Event listeners
        document.getElementById('rsvp-form').addEventListener('submit', (e) => this.handleRSVPSubmit(e));
        
        // Name dropdown listener
        document.getElementById('guest-name-select').addEventListener('change', (e) => this.handleNameSelectChange(e));
        
        // Photo upload listeners
        document.getElementById('pumpkin-photo').addEventListener('change', (e) => this.handlePhotoSelect(e));
        document.getElementById('remove-photo').addEventListener('click', (e) => this.handlePhotoRemove(e));
        
        // Gallery upload listeners
        document.getElementById('gallery-upload-btn').addEventListener('click', (e) => this.handleGalleryUploadClick(e));
        document.getElementById('gallery-photo-upload').addEventListener('change', (e) => this.handleGalleryPhotoSelect(e));
        document.getElementById('gallery-upload-submit').addEventListener('click', (e) => this.handleGalleryUploadSubmit(e));
        document.getElementById('gallery-upload-cancel').addEventListener('click', (e) => this.handleGalleryUploadCancel(e));
        
        // Pumpkin patch checkbox listener
        document.getElementById('pumpkin-patch').addEventListener('change', (e) => this.handlePumpkinPatchChange(e));
        
        // Filter tab event listeners
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Initialize name input state (hidden and not required by default)
        const nameInput = document.getElementById('guest-name');
        if (nameInput) {
            nameInput.style.display = 'none';
            nameInput.required = false;
            nameInput.value = '';
        }

        // Load initial data
        this.loadRSVPs();
        this.loadGalleryImages();

        // Set up periodic refresh if Apps Script is configured
        if (this.useAppsScript) {
            setInterval(() => this.loadRSVPs(), this.refreshInterval);
            // Refresh gallery less frequently (every 5 minutes)
            setInterval(() => this.loadGalleryImages(), 300000);
        }
    }

    async loadRSVPs() {
        if (this.useAppsScript) {
            await this.loadFromSheet();
        } else {
            this.loadSampleData();
        }
        this.renderRSVPGrid();
        this.populateNameDropdown();
    }

    async loadGalleryImages() {
        if (!this.useAppsScript) {
            this.loadSampleGallery();
            return;
        }

        try {
            this.showGalleryLoading(true);

            // Try fetch first, then fallback to JSONP if CORS fails
            let result;
            try {
                const response = await fetch(`${this.appsScriptUrl}?action=getGalleryImages&t=${Date.now()}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                result = await response.json();
            } catch (fetchError) {
                console.log('Fetch failed, trying JSONP fallback:', fetchError.message);
                // Fallback to JSONP for CORS issues
                result = await this.makeJsonpRequest('getGalleryImages');
            }
            
            if (result.success && result.data) {
                this.renderGallery(result.data.images);
            } else {
                throw new Error(result.error || 'Failed to load gallery images');
            }
        } catch (error) {
            console.error('Error loading gallery:', error);
            this.showError('Failed to load gallery images: ' + error.message);
            this.loadSampleGallery();
        } finally {
            this.showGalleryLoading(false);
        }
    }

    loadSampleGallery() {
        // Fallback sample gallery for when Apps Script is not available
        const sampleImages = [
            {
                id: 'sample1',
                name: 'Sample Pumpkin 1',
                directUrl: 'https://via.placeholder.com/400x300/ff6b35/ffffff?text=🎃+Sample+1',
                thumbnailUrl: 'https://via.placeholder.com/400x300/ff6b35/ffffff?text=🎃+Sample+1'
            },
            {
                id: 'sample2', 
                name: 'Sample Pumpkin 2',
                directUrl: 'https://via.placeholder.com/400x300/f7931e/ffffff?text=🎃+Sample+2',
                thumbnailUrl: 'https://via.placeholder.com/400x300/f7931e/ffffff?text=🎃+Sample+2'
            }
        ];
        this.renderGallery(sampleImages);
    }

    renderGallery(images) {
        const gallery = document.getElementById('image-gallery');
        if (!gallery) return;

        gallery.innerHTML = '';

        if (!images || images.length === 0) {
            gallery.innerHTML = `
                <div class="gallery-empty">
                    <p>No images in the gallery yet. Be the first to upload one! 📸</p>
                </div>
            `;
            return;
        }

        images.forEach(image => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            galleryItem.innerHTML = `
                <img src="${image.thumbnailUrl || image.directUrl}" 
                     alt="Pumpkinfest photo" 
                     class="gallery-img"
                     loading="lazy"
                     onclick="window.open('${image.driveUrl || image.directUrl}', '_blank')">
            `;
            
            gallery.appendChild(galleryItem);
        });
    }

    showGalleryLoading(show) {
        const loadingElement = document.getElementById('gallery-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    async loadFromSheet() {
        try {
            this.showLoading(true);

            const params = new URLSearchParams({
                action: 'getRSVPs',
                t: Date.now()
            });

            const response = await fetch(`${this.appsScriptUrl}?${params}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.rsvps = result.data.rsvps || [];
                this.lastModified = result.data.lastModified;
                this.updateSyncStatus('✅ RSVPs Loaded');
            } else {
                throw new Error(result.error || 'Failed to load RSVPs');
            }

        } catch (error) {
            console.error('Error loading from sheet:', error);
            this.loadSampleData();
            this.updateSyncStatus('⚠️ Using sample data');
        } finally {
            this.showLoading(false);
        }
    }

    loadSampleData() {
        // Sample RSVPs for demonstration
        this.rsvps = [
            {
                id: 'sample-1',
                name: 'Alex',
                attendance: 'Yes',
                needPumpkin: 'No',
                bringing: 'Pumpkin beer and my famous carving knife set! 🔪',
                timestamp: new Date().toISOString(),
                pumpkinPatch: 'Yes',
                patchDates: 'Sat 10/25, Sun 10/26'
            },
            {
                id: 'sample-2',
                name: 'Sam',
                attendance: 'Maybe',
                needPumpkin: 'Yes',
                bringing: 'Will bring pumpkin pie if I can make it',
                timestamp: new Date().toISOString(),
                pumpkinPatch: 'No',
                patchDates: ''
            },
            {
                id: 'sample-3',
                name: 'Jordan',
                attendance: 'Yes',
                needPumpkin: 'Maybe',
                bringing: 'Carving tools and Halloween decorations',
                timestamp: new Date().toISOString(),
                pumpkinPatch: 'Yes',
                patchDates: 'Mon 10/27, Wed 10/29'
            },
            {
                id: 'sample-4',
                name: 'Taylor',
                attendance: 'No',
                needPumpkin: '',
                bringing: 'Sorry, can\'t make it this year!',
                timestamp: new Date().toISOString(),
                pumpkinPatch: 'No',
                patchDates: ''
            },
            {
                id: 'sample-5',
                name: 'Casey',
                attendance: '',
                needPumpkin: '',
                bringing: '',
                timestamp: new Date().toISOString(),
                pumpkinPatch: '',
                patchDates: ''
            }
        ];
    }

    async handleRSVPSubmit(event) {
        event.preventDefault();

        // Show loading spinner
        this.showRSVPLoading(true);

        const formData = new FormData(event.target);

        // Get name from either dropdown selection or text input
        let guestName = '';
        const nameSelect = formData.get('guestNameSelect');
        if (nameSelect === 'Other' || nameSelect === '') {
            guestName = formData.get('guestName')?.trim() || '';
        } else {
            guestName = nameSelect;
        }

        // Validate that we have a guest name
        if (!guestName) {
            this.showError('Please enter your name or select from the dropdown.');
            this.showRSVPLoading(false);
            return;
        }

        // Handle pumpkin patch dates - collect all checked values
        const patchDatesElements = formData.getAll('patchDates');
        const patchDatesString = patchDatesElements.join(', ');

        // Handle photo upload (separate from RSVP data)
        const photoFile = document.getElementById('pumpkin-photo').files[0];
        
        if (photoFile) {
            try {
                await this.uploadPhotoToDrive(photoFile, guestName);
                console.log('Photo uploaded successfully');
                // Refresh gallery to show new image
                setTimeout(() => this.loadGalleryImages(), 2000);
            } catch (error) {
                console.error('Photo upload failed:', error);
                // Continue with RSVP submission even if photo fails
                alert('Photo upload failed, but RSVP will be submitted. Error: ' + error.message);
            }
        }

        const rsvpData = {
            name: guestName,
            email: formData.get('guestEmail')?.trim() || '',
            attendance: formData.get('attendance'),
            needPumpkin: formData.get('needPumpkin') || '',
            bringing: formData.get('bringing').trim() || '',
            pumpkinPatch: formData.get('pumpkinPatch') ? 'Yes' : 'No',
            patchDates: patchDatesString,
            timestamp: new Date().toISOString()
        };

        if (!rsvpData.name || !rsvpData.attendance) {
            this.showRSVPLoading(false);
            alert('Please fill in your name and attendance status.');
            return;
        }

        console.log('Submitting RSVP:', rsvpData);

        try {
            if (this.useAppsScript) {
                // Check if this is an update to an existing RSVP
                const existingRSVP = this.rsvps.find(rsvp => rsvp.name === guestName);
                const isUpdate = !!existingRSVP;
                
                // Submit via Apps Script
                await this.submitRSVP(rsvpData, isUpdate);
                await this.loadFromSheet();
                this.renderRSVPGrid();
                this.populateNameDropdown();
                this.updateSyncStatus(isUpdate ? '✅ RSVP Updated' : '✅ RSVP Submitted');
                this.showRSVPLoading(false);
                this.resetForm();
                this.hideFormAndShowSuccess();
            } else {
                // Add locally for demo
                // Check if this is an update to existing RSVP
                const existingIndex = this.rsvps.findIndex(rsvp => rsvp.name === rsvpData.name);
                
                if (existingIndex !== -1) {
                    // Update existing RSVP
                    this.rsvps[existingIndex] = { ...this.rsvps[existingIndex], ...rsvpData };
                } else {
                    // Add new RSVP
                    const tempId = 'temp_' + Date.now();
                    rsvpData.id = tempId;
                    this.rsvps.push(rsvpData);
                }
                
                this.renderRSVPGrid();
                this.populateNameDropdown();
                this.updateSyncStatus('✅ RSVP Added Locally');
                this.showRSVPLoading(false);
                this.resetForm();
                this.hideFormAndShowSuccess();
                
                setTimeout(() => {
                    const sheetUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/edit#gid=${this.gid}`;
                    if (confirm(`RSVP added locally! To persist this RSVP, please add it to your Google Sheet.\n\nName: ${rsvpData.name}\nAttendance: ${rsvpData.attendance}\n\nOpen Google Sheet now?`)) {
                        window.open(sheetUrl, '_blank');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error submitting RSVP:', error);
            this.showRSVPLoading(false);
            this.showError(`Failed to submit RSVP: ${error.message}`);
        }
    }

    async submitRSVP(rsvpData, isUpdate = false) {
        if (!this.useAppsScript) {
            console.warn('Apps Script not configured, cannot submit RSVP');
            return;
        }

        try {
            const params = new URLSearchParams({
                action: isUpdate ? 'updateRSVP' : 'addRSVP',
                name: rsvpData.name,
                email: rsvpData.email,
                attendance: rsvpData.attendance,
                needPumpkin: rsvpData.needPumpkin,
                bringing: rsvpData.bringing,
                pumpkinPatch: rsvpData.pumpkinPatch,
                patchDates: rsvpData.patchDates,
                timestamp: rsvpData.timestamp,
                isUpdate: isUpdate
            });

            const url = `${this.appsScriptUrl}?${params.toString()}`;
            console.log(`Sending RSVP ${isUpdate ? 'update' : 'submission'} request to:`, url);

            const response = await fetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`Apps Script error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || result.data?.error || 'Failed to submit RSVP');
            }

            return result;

        } catch (error) {
            console.error('Error in submitRSVP:', error);
            throw error;
        }
    }

    populateNameDropdown() {
        const nameSelect = document.getElementById('guest-name-select');
        
        // Get unique names from existing RSVPs
        const existingNames = [...new Set(this.rsvps.map(rsvp => rsvp.name).filter(name => name && name.trim() !== ''))];
        
        // Clear existing options except the default and "Other"
        nameSelect.innerHTML = `
            <option value="">Select your name or choose "Other"...</option>
            <option value="Other">Other (add new person)</option>
        `;
        
        // Add existing names as options
        existingNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            nameSelect.appendChild(option);
        });
    }

    handleNameSelectChange(event) {
        const nameInput = document.getElementById('guest-name');
        const selectedValue = event.target.value;
        
        if (selectedValue === 'Other') {
            // Show text input for new name and make it required
            nameInput.style.display = 'block';
            nameInput.required = true;
            nameInput.focus();
            this.clearForm();
        } else if (selectedValue && selectedValue !== '') {
            // Hide text input, remove required, and populate form with existing data
            nameInput.style.display = 'none';
            nameInput.required = false;
            nameInput.value = ''; // Clear the hidden input
            this.populateFormWithExistingData(selectedValue);
        } else {
            // Default selection - hide text input, remove required, and clear form
            nameInput.style.display = 'none';
            nameInput.required = false;
            nameInput.value = ''; // Clear the hidden input
            this.clearForm();
        }
    }

    populateFormWithExistingData(name) {
        // Find the RSVP data for this person
        const existingRSVP = this.rsvps.find(rsvp => rsvp.name === name);
        
        if (existingRSVP) {
            // Populate all form fields with existing data
            document.getElementById('guest-email').value = existingRSVP.email || '';
            document.getElementById('attendance').value = existingRSVP.attendance || '';
            document.getElementById('need-pumpkin').value = existingRSVP.needPumpkin || '';
            document.getElementById('bringing').value = existingRSVP.bringing || '';
            
            // Handle pumpkin patch checkbox
            const pumpkinPatchCheckbox = document.getElementById('pumpkin-patch');
            pumpkinPatchCheckbox.checked = existingRSVP.pumpkinPatch === 'Yes';
            
            // Handle patch dates
            if (existingRSVP.patchDates) {
                const selectedDates = existingRSVP.patchDates.split(', ').map(date => date.trim());
                document.querySelectorAll('input[name="patchDates"]').forEach(checkbox => {
                    checkbox.checked = selectedDates.includes(checkbox.value);
                });
            }
            
            // Trigger pumpkin patch change to show/hide dates appropriately
            this.handlePumpkinPatchChange({ target: pumpkinPatchCheckbox });
        }
    }

    clearForm() {
        // Clear all form fields except the name dropdown
        document.getElementById('guest-email').value = '';
        document.getElementById('attendance').value = '';
        document.getElementById('need-pumpkin').value = '';
        document.getElementById('bringing').value = '';
        document.getElementById('pumpkin-patch').checked = false;
        document.querySelectorAll('input[name="patchDates"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.getElementById('patch-dates-container').style.display = 'none';
    }

    handlePumpkinPatchChange(event) {
        const patchDatesContainer = document.getElementById('patch-dates-container');
        
        if (event.target.checked) {
            // If checked, show the date options
            patchDatesContainer.style.display = 'block';
        } else {
            // If unchecked, hide the date options and clear selections
            patchDatesContainer.style.display = 'none';
            // Clear any previously selected dates
            document.querySelectorAll('input[name="patchDates"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }

    handleFilterChange(event) {
        // Remove active class from all tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        event.target.classList.add('active');
        
        // Update current filter
        this.currentFilter = event.target.dataset.filter;
        
        // Re-render the grid with new filter
        this.renderRSVPGrid();
    }

    renderRSVPGrid() {
        const gridBody = document.getElementById('rsvp-grid-body');
        const noRSVPsMessage = document.getElementById('no-rsvps-message');
        const grid = document.getElementById('rsvp-grid');
        
        // Filter RSVPs based on current filter
        let filteredRSVPs = this.getFilteredRSVPs();
        
        if (filteredRSVPs.length === 0) {
            grid.style.display = 'none';
            noRSVPsMessage.style.display = 'block';
            return;
        }
        
        grid.style.display = 'table';
        noRSVPsMessage.style.display = 'none';
        
        let html = '';
        
        filteredRSVPs.forEach(rsvp => {
            const attendanceClass = this.getAttendanceClass(rsvp.attendance);
            const pumpkinClass = this.getPumpkinClass(rsvp.needPumpkin);
            
            html += `<tr>`;
            html += `<td><span class="grid-name">${this.escapeHtml(rsvp.name)}</span></td>`;
            html += `<td><span class="grid-attendance ${attendanceClass}">${this.formatAttendance(rsvp.attendance)}</span></td>`;
            html += `<td><span class="grid-pumpkin ${pumpkinClass}">${this.formatPumpkinNeed(rsvp.needPumpkin)}</span></td>`;
            html += `<td><span class="grid-bringing">${this.escapeHtml(rsvp.bringing || '')}</span></td>`;
            html += `<td><span class="grid-patch-dates">${this.formatPatchDates(rsvp.patchDates)}</span></td>`;
            html += `</tr>`;
        });
        
        gridBody.innerHTML = html;
    }

    getFilteredRSVPs() {
        let filtered;
        switch (this.currentFilter) {
            case 'Going':
                filtered = this.rsvps.filter(rsvp => rsvp.attendance === 'Yes');
                break;
            case 'Maybe':
                filtered = this.rsvps.filter(rsvp => rsvp.attendance === 'Maybe');
                break;
            case 'No':
                filtered = this.rsvps.filter(rsvp => rsvp.attendance === 'No');
                break;
            case 'Not Responded':
                filtered = this.rsvps.filter(rsvp => !rsvp.attendance || rsvp.attendance.trim() === '');
                break;
            case 'Everyone':
            default:
                filtered = [...this.rsvps];
                break;
        }
        
        // Sort first by attendance, then by name alphabetically
        return filtered.sort((a, b) => {
            // Define attendance priority order (Yes first, then Maybe, then No, then empty/not responded)
            const attendancePriority = {
                'Yes': 1,
                'Maybe': 2,
                'No': 3,
                '': 4, // Empty/not responded
                null: 4,
                undefined: 4
            };
            
            const attendanceA = a.attendance || '';
            const attendanceB = b.attendance || '';
            
            const priorityA = attendancePriority[attendanceA] || 4;
            const priorityB = attendancePriority[attendanceB] || 4;
            
            // First sort by attendance priority
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            // If attendance is the same, sort by name alphabetically
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    getAttendanceClass(attendance) {
        switch (attendance) {
            case 'Yes': return 'yes';
            case 'Maybe': return 'maybe';
            case 'No': return 'no';
            default: return 'not-responded';
        }
    }

    getPumpkinClass(needPumpkin) {
        switch (needPumpkin) {
            case 'Yes': return 'yes';
            case 'No': return 'no';
            default: return '';
        }
    }

    formatAttendance(attendance) {
        if (!attendance || attendance.trim() === '') {
            return 'Not responded';
        }
        return attendance;
    }

    formatPumpkinNeed(needPumpkin) {
        if (!needPumpkin || needPumpkin.trim() === '') {
            return '-';
        }
        return needPumpkin;
    }

    formatPatchDates(patchDates) {
        if (!patchDates || patchDates.trim() === '') {
            return '-';
        }
        return patchDates;
    }

    resetForm() {
        const form = document.getElementById('rsvp-form');
        form.reset();
        
        // Reset name dropdown and hide name input
        document.getElementById('guest-name-select').value = '';
        document.getElementById('guest-name').style.display = 'none';
        
        // Reset pumpkin patch checkbox to unchecked and hide dates
        document.getElementById('pumpkin-patch').checked = false;
        document.getElementById('patch-dates-container').style.display = 'none';
    }

    hideFormAndShowSuccess() {
        // Hide the RSVP form
        const rsvpForm = document.getElementById('rsvp-form');
        const rsvpSection = rsvpForm.closest('.section');
        
        if (rsvpSection) {
            rsvpSection.style.display = 'none';
        } else {
            rsvpForm.style.display = 'none';
        }
        
        // Create and show success message
        const successDiv = document.createElement('div');
        successDiv.id = 'rsvp-success-message';
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <h2>🎃 Thank You!</h2>
                <p>Your RSVP has been submitted successfully!</p>
                <p>We can't wait to see you at the annual pumpkin party!</p>
                <button onclick="location.reload()" class="btn">Submit Another RSVP</button>
            </div>
        `;
        
        // Insert the success message where the form was
        if (rsvpSection) {
            rsvpSection.parentNode.insertBefore(successDiv, rsvpSection);
        } else {
            rsvpForm.parentNode.insertBefore(successDiv, rsvpForm);
        }
    }

    showRSVPLoading(show) {
        const loading = document.getElementById('rsvp-loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
        // Since we removed the loading section, we can show loading state in the sync status instead
        const syncStatus = document.getElementById('sync-status-text');
        if (syncStatus && show) {
            syncStatus.textContent = '🔄 Loading RSVPs...';
            syncStatus.style.display = 'block';
        } else if (syncStatus && !show) {
            syncStatus.style.display = 'none';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            // Fallback: show error in sync status if error div doesn't exist
            const syncStatus = document.getElementById('sync-status-text');
            if (syncStatus) {
                syncStatus.textContent = `❌ ${message}`;
                syncStatus.style.display = 'block';
                syncStatus.style.color = 'var(--color-error)';
                setTimeout(() => {
                    syncStatus.style.display = 'none';
                    syncStatus.style.color = '';
                }, 5000);
            } else {
                // Last resort: use alert
                console.error('Error:', message);
                alert(`Error: ${message}`);
            }
        }
    }

    updateSyncStatus(message) {
        const statusText = document.getElementById('sync-status-text');
        statusText.textContent = message;
        statusText.style.display = 'block';
        
        setTimeout(() => {
            statusText.style.display = 'none';
        }, 3000);
    }

    // Photo Upload Methods
    handlePhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            event.target.value = '';
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            event.target.value = '';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photo-preview');
            const img = document.getElementById('preview-img');
            
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    handlePhotoRemove(event) {
        event.preventDefault();
        
        // Clear file input
        document.getElementById('pumpkin-photo').value = '';
        
        // Hide preview
        document.getElementById('photo-preview').style.display = 'none';
        document.getElementById('preview-img').src = '';
    }

    async uploadPhotoToDrive(file, guestName) {
        // For now, we'll implement a client-side approach
        // In a real implementation, you'd want to handle this server-side for security
        
        // Generate a unique filename
        const timestamp = new Date().getTime();
        const sanitizedName = guestName.replace(/[^a-zA-Z0-9]/g, '_');
        const extension = file.name.split('.').pop();
        const filename = `pumpkin_${sanitizedName}_${timestamp}.${extension}`;

        try {
            // Convert file to base64 for Apps Script
            const base64Data = await this.fileToBase64(file);
            
            // Send to Apps Script for Drive upload
            const response = await fetch(this.appsScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'uploadPhoto',
                    filename: filename,
                    data: base64Data,
                    mimeType: file.type
                })
            });

            const result = await response.json();
            
            if (result.success && result.data.driveUrl) {
                return result.data.driveUrl;
            } else {
                throw new Error(result.error || 'Failed to upload photo');
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            throw error;
        }
    }

    // Gallery Upload Methods
    handleGalleryUploadClick(event) {
        event.preventDefault();
        document.getElementById('gallery-photo-upload').click();
    }

    handleGalleryPhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, or GIF).');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }

        // Show preview
        const reader = new FileReader();
        const preview = document.getElementById('gallery-upload-preview');
        const img = document.getElementById('gallery-preview-img');
        
        reader.onload = function(e) {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    async handleGalleryUploadSubmit(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('gallery-photo-upload');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file first.');
            return;
        }

        try {
            // Show loading state
            const submitBtn = document.getElementById('gallery-upload-submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Uploading...';
            submitBtn.disabled = true;

            // Upload to Google Drive
            await this.uploadGalleryPhotoToDrive(file);
            
            // Success feedback
            alert('Photo uploaded successfully! 🎃');
            
            // Reset the form
            this.handleGalleryUploadCancel(event);
            
            // Refresh the gallery
            setTimeout(() => this.loadGalleryImages(), 2000);
            
        } catch (error) {
            console.error('Gallery upload failed:', error);
            alert('Failed to upload photo: ' + error.message);
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('gallery-upload-submit');
            submitBtn.textContent = 'Upload';
            submitBtn.disabled = false;
        }
    }

    handleGalleryUploadCancel(event) {
        event.preventDefault();
        
        // Clear file input
        document.getElementById('gallery-photo-upload').value = '';
        
        // Hide preview
        document.getElementById('gallery-upload-preview').style.display = 'none';
        document.getElementById('gallery-preview-img').src = '';
    }

    async uploadGalleryPhotoToDrive(file) {
        // Generate a unique filename for gallery photos
        const timestamp = new Date().getTime();
        const extension = file.name.split('.').pop();
        const filename = `gallery_photo_${timestamp}.${extension}`;

        try {
            // Convert file to base64 for Apps Script
            const base64Data = await this.fileToBase64(file);
            
            // Send to Apps Script for Drive upload
            const response = await fetch(this.appsScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'uploadPhoto',
                    filename: filename,
                    fileData: base64Data,
                    mimeType: file.type
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            console.log('Gallery photo uploaded successfully:', result.data);
            return result.data;
            
        } catch (error) {
            console.error('Error uploading gallery photo:', error);
            throw error;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove the data:image/...;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    makeJsonpRequest(action, additionalParams = {}) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Create callback function
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };
            
            // Create script tag
            const script = document.createElement('script');
            const params = new URLSearchParams({
                action: action,
                callback: callbackName,
                t: Date.now(),
                ...additionalParams
            });
            
            script.src = `${this.appsScriptUrl}?${params.toString()}`;
            script.onerror = function() {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request failed'));
            };
            
            // Set timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('JSONP request timeout'));
                }
            }, 10000);
            
            document.body.appendChild(script);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.pumpkinfestRSVP = new PumpkinfestRSVP();
        });
    } else {
        window.pumpkinfestRSVP = new PumpkinfestRSVP();
    }
}