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
            appsScriptUrl: 'YOUR_APPS_SCRIPT_URL_HERE', // Replace with your deployed Apps Script URL
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
                timestamp: new Date().toISOString()
            },
            {
                id: 'sample-2',
                name: 'Sam',
                attendance: 'Maybe',
                needPumpkin: 'Yes',
                bringing: 'Will bring pumpkin pie if I can make it',
                timestamp: new Date().toISOString()
            },
            {
                id: 'sample-3',
                name: 'Jordan',
                attendance: 'Yes',
                needPumpkin: 'Maybe',
                bringing: 'Carving tools and Halloween decorations',
                timestamp: new Date().toISOString()
            },
            {
                id: 'sample-4',
                name: 'Taylor',
                attendance: 'No',
                needPumpkin: '',
                bringing: 'Sorry, can\'t make it this year!',
                timestamp: new Date().toISOString()
            },
            {
                id: 'sample-5',
                name: 'Casey',
                attendance: '',
                needPumpkin: '',
                bringing: '',
                timestamp: new Date().toISOString()
            }
        ];
    }

    async handleRSVPSubmit(event) {
        event.preventDefault();

        // Show loading spinner
        this.showRSVPLoading(true);

        const formData = new FormData(event.target);

        const rsvpData = {
            name: formData.get('guestName').trim(),
            attendance: formData.get('attendance'),
            needPumpkin: formData.get('needPumpkin') || '',
            bringing: formData.get('bringing').trim() || '',
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
                const tempId = 'temp_' + Date.now();
                rsvpData.id = tempId;
                this.rsvps.push(rsvpData);
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

    resetForm() {
        document.getElementById('rsvp-form').reset();
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