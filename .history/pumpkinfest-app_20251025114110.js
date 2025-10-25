/**
 * Pumpkinfest 2025 RSVP System
 * Based on the Google Sheets Checklist architecture
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
        
        // Pumpkin patch checkbox listener
        document.getElementById('pumpkin-patch').addEventListener('change', (e) => this.handlePumpkinPatchChange(e));
        
        // Filter tab event listeners
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Load initial data
        this.loadRSVPs();

        // Set up periodic refresh if Apps Script is configured
        if (this.useAppsScript) {
            setInterval(() => this.loadRSVPs(), this.refreshInterval);
        }
    }

    async loadRSVPs() {
        if (this.useAppsScript) {
            await this.loadFromSheet();
        } else {
            this.loadSampleData();
        }
        this.renderRSVPs();
        this.renderRSVPGrid();
        this.populateNameDropdown();
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
            guestName = formData.get('guestName').trim();
        } else {
            guestName = nameSelect;
        }

        // Handle pumpkin patch dates - collect all checked values
        const patchDatesElements = formData.getAll('patchDates');
        const patchDatesString = patchDatesElements.join(', ');

        const rsvpData = {
            name: guestName,
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
                // Submit via Apps Script
                await this.submitRSVP(rsvpData);
                await this.loadFromSheet();
                this.updateSyncStatus('✅ RSVP Submitted');
                this.showRSVPLoading(false);
                this.resetForm();
                alert('🎃 Thanks for your RSVP! See you at the party!');
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
                
                this.renderRSVPs();
                this.renderRSVPGrid();
                this.updateSyncStatus('✅ RSVP Added Locally');
                this.showRSVPLoading(false);
                this.resetForm();
                
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

    async submitRSVP(rsvpData) {
        if (!this.useAppsScript) {
            console.warn('Apps Script not configured, cannot submit RSVP');
            return;
        }

        try {
            const params = new URLSearchParams({
                action: 'addRSVP',
                name: rsvpData.name,
                attendance: rsvpData.attendance,
                needPumpkin: rsvpData.needPumpkin,
                bringing: rsvpData.bringing,
                pumpkinPatch: rsvpData.pumpkinPatch,
                patchDates: rsvpData.patchDates,
                timestamp: rsvpData.timestamp
            });

            const url = `${this.appsScriptUrl}?${params.toString()}`;
            console.log('Sending RSVP request to:', url);

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

    renderRSVPs() {
        const rsvpList = document.getElementById('rsvp-list');

        if (this.rsvps.length === 0) {
            rsvpList.innerHTML = '<p style="text-align: center; color: #ff69b4; padding: 20px;">No RSVPs yet. Be the first! 🎃</p>';
            return;
        }

        // Group RSVPs by attendance
        const groups = {
            'Yes': [],
            'Maybe': [],
            'No': []
        };

        this.rsvps.forEach(rsvp => {
            if (groups[rsvp.attendance]) {
                groups[rsvp.attendance].push(rsvp);
            }
        });

        let html = '';

        // Render each group
        Object.keys(groups).forEach(attendance => {
            if (groups[attendance].length > 0) {
                const emoji = attendance === 'Yes' ? '🎃' : attendance === 'Maybe' ? '🤔' : '😞';
                html += `<div class="rsvp-group">`;
                html += `<h4>${emoji} ${attendance} (${groups[attendance].length})</h4>`;
                html += `<div class="rsvp-items">`;

                groups[attendance].forEach(rsvp => {
                    html += `<div class="rsvp-item">`;
                    html += `<div class="rsvp-name">${this.escapeHtml(rsvp.name)}</div>`;
                    
                    if (rsvp.needPumpkin && rsvp.needPumpkin !== '') {
                        const pumpkinEmoji = rsvp.needPumpkin === 'Yes' ? '🎃' : rsvp.needPumpkin === 'Maybe' ? '🤷' : '✋';
                        html += `<div class="rsvp-detail">${pumpkinEmoji} Pumpkin: ${this.escapeHtml(rsvp.needPumpkin)}</div>`;
                    }
                    
                    if (rsvp.bringing && rsvp.bringing.trim() !== '') {
                        html += `<div class="rsvp-bringing">💭 ${this.escapeHtml(rsvp.bringing)}</div>`;
                    }
                    
                    html += `</div>`;
                });

                html += `</div></div>`;
            }
        });

        rsvpList.innerHTML = html;
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
            // Show text input for new name
            nameInput.style.display = 'block';
            nameInput.focus();
            this.clearForm();
        } else if (selectedValue && selectedValue !== '') {
            // Hide text input and populate form with existing data
            nameInput.style.display = 'none';
            this.populateFormWithExistingData(selectedValue);
        } else {
            // Default selection - hide text input and clear form
            nameInput.style.display = 'none';
            this.clearForm();
        }
    }

    populateFormWithExistingData(name) {
        // Find the RSVP data for this person
        const existingRSVP = this.rsvps.find(rsvp => rsvp.name === name);
        
        if (existingRSVP) {
            // Populate all form fields with existing data
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
        switch (this.currentFilter) {
            case 'Going':
                return this.rsvps.filter(rsvp => rsvp.attendance === 'Yes');
            case 'Maybe':
                return this.rsvps.filter(rsvp => rsvp.attendance === 'Maybe');
            case 'No':
                return this.rsvps.filter(rsvp => rsvp.attendance === 'No');
            case 'Not Responded':
                return this.rsvps.filter(rsvp => !rsvp.attendance || rsvp.attendance.trim() === '');
            case 'Everyone':
            default:
                return [...this.rsvps];
        }
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

    showRSVPLoading(show) {
        const loading = document.getElementById('rsvp-loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    updateSyncStatus(message) {
        const statusText = document.getElementById('sync-status-text');
        statusText.textContent = message;
        statusText.style.display = 'block';
        
        setTimeout(() => {
            statusText.style.display = 'none';
        }, 3000);
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