// QR Code Scanner for Event Check-in - Young Access Hub
// Handles QR code scanning, participant verification, and check-in tracking

class EventScanner {
    constructor() {
        this.isAuthenticated = false;
        this.isScanning = false;
        this.scanner = null;
        this.recentScans = [];
        this.lastScanTime = 0;  // Add debounce tracking
        this.scanCooldown = 2000;  // 2 second cooldown between scans
        this.stats = {
            checkedIn: 0,
            totalRegistered: 0,
            attendanceRate: 0
        };
        this.apiBaseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? 'http://localhost:3000/api'  // Development
            : 'https://yah-backend.onrender.com/api'; // Production (yahsl.org)
        this.staffAccessCode = 'STAFF2024'; // Default staff access code
        
        this.init();
    }

    init() {
        this.checkAuthState();
        this.bindEvents();
        this.startAutoRefresh();
    }

    checkAuthState() {
        const authState = sessionStorage.getItem('yah_scanner_auth');
        if (authState === 'true') {
            this.isAuthenticated = true;
            this.showScanner();
            this.loadStats();
        }
    }

    bindEvents() {
        // Authentication form
        document.getElementById('authForm')?.addEventListener('submit', (e) => {
            this.handleAuthentication(e);
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Scanner controls
        document.getElementById('startScanBtn')?.addEventListener('click', () => {
            this.startScanning();
        });

        document.getElementById('stopScanBtn')?.addEventListener('click', () => {
            this.stopScanning();
        });

        // Manual entry
        document.getElementById('manualEntryForm')?.addEventListener('submit', (e) => {
            this.handleManualEntry(e);
        });

        // Auto-hide scan results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#scanResult')) {
                this.hideScanResult();
            }
        });
    }

    async handleAuthentication(e) {
        e.preventDefault();
        
        const form = e.target;
        const codeInput = document.getElementById('staffCode');
        const code = codeInput.value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');

        this.setButtonLoading(submitBtn, true);
        this.clearAuthAlert();

        try {
            await this.simulateDelay(1000);

            if (code === this.staffAccessCode) {
                this.isAuthenticated = true;
                sessionStorage.setItem('yah_scanner_auth', 'true');
                
                this.showAuthAlert('Access granted! Loading scanner...', 'success');
                
                setTimeout(() => {
                    this.showScanner();
                    this.loadStats();
                }, 1000);
                
            } else {
                this.showAuthAlert('Invalid staff access code. Please try again.', 'danger');
                codeInput.focus();
                codeInput.select();
            }

        } catch (error) {
            console.error('Authentication error:', error);
            this.showAuthAlert('Authentication failed. Please try again.', 'danger');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    showScanner() {
        document.getElementById('authGate').style.display = 'none';
        document.getElementById('scannerInterface').style.display = 'block';
        document.title = 'QR Scanner - YAH Event Check-in';
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scanner/stats`);
            const data = await response.json();

            if (response.ok && data.success) {
                this.updateStats(data.data);
            } else {
                // Use mock data for demo
                this.updateStats({
                    checkedIn: 0,
                    totalRegistered: 50,
                    attendanceRate: 0
                });
            }
        } catch (error) {
            console.error('Stats loading error:', error);
            // Use mock data
            this.updateStats({
                checkedIn: 0,
                totalRegistered: 50,
                attendanceRate: 0
            });
        }
    }

    updateStats(stats) {
        this.stats = stats;
        document.getElementById('totalCheckedIn').textContent = stats.checkedIn;
        document.getElementById('totalRegistered').textContent = stats.totalRegistered;
        document.getElementById('attendanceRate').textContent = `${stats.attendanceRate}%`;
    }

    async startScanning() {
        if (this.isScanning) return;

        try {
            const startBtn = document.getElementById('startScanBtn');
            const stopBtn = document.getElementById('stopScanBtn');
            
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            
            // Clear any existing scanner first
            if (this.scanner) {
                try {
                    await this.scanner.clear();
                } catch (e) {
                    console.warn('Error clearing existing scanner:', e);
                }
                this.scanner = null;
            }

            // Initialize QR scanner with error handling
            try {
                this.scanner = new Html5QrcodeScanner('qr-reader', {
                    qrbox: {
                        width: 250,
                        height: 250,
                    },
                    fps: 20,
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    showZoomSliderIfSupported: true,
                    defaultZoomValueIfSupported: 2,
                });

                // Wrap the callbacks to handle errors
                const successCallback = (qrCodeMessage) => {
                    try {
                        // Add additional validation here to prevent library errors
                        if (qrCodeMessage === null || qrCodeMessage === undefined) {
                            console.warn('HTML5-QRCode returned null/undefined data');
                            return;
                        }
                        
                        // Ensure we have a valid string
                        if (typeof qrCodeMessage !== 'string' && typeof qrCodeMessage !== 'number') {
                            console.warn('HTML5-QRCode returned unexpected data type:', typeof qrCodeMessage);
                            return;
                        }
                        
                        this.handleScanSuccess(qrCodeMessage);
                    } catch (error) {
                        console.error('Error in scan success handler:', error);
                        this.showScanResult('error', 'Processing Error', 'Failed to process QR code. Please try again.');
                    }
                };

                const errorCallback = (errorMessage) => {
                    try {
                        this.handleScanError(errorMessage);
                    } catch (error) {
                        console.error('Error in scan error handler:', error);
                    }
                };

                this.scanner.render(successCallback, errorCallback);

                this.isScanning = true;
                this.showAlert('Scanner started. Point camera at QR codes to check in participants.', 'info');
                
            } catch (scannerError) {
                console.error('Scanner initialization error:', scannerError);
                throw new Error('Failed to initialize camera scanner');
            }
            
        } catch (error) {
            console.error('Scanner start error:', error);
            this.showAlert('Failed to start scanner. Please check camera permissions and try again.', 'error');
            this.resetScannerButtons();
        }
    }

    async stopScanning() {
        if (!this.isScanning) return;

        try {
            if (this.scanner) {
                await this.scanner.clear();
                this.scanner = null;
            }
            
            this.isScanning = false;
            this.resetScannerButtons();
            this.showAlert('Scanner stopped.', 'info');
            
        } catch (error) {
            console.error('Scanner stop error:', error);
        }
    }

    resetScannerButtons() {
        document.getElementById('startScanBtn').style.display = 'inline-block';
        document.getElementById('stopScanBtn').style.display = 'none';
    }

    async handleScanSuccess(qrCodeMessage) {
        // Add comprehensive null/undefined checks
        if (!qrCodeMessage || qrCodeMessage === null || qrCodeMessage === undefined) {
            console.warn('QR code scan returned empty/null data');
            return;
        }

        // Convert to string if it's not already (safety check for library issues)
        let qrString;
        try {
            qrString = String(qrCodeMessage).trim();
        } catch (error) {
            console.error('Error converting QR code to string:', error);
            return;
        }

        if (!qrString || qrString.length === 0) {
            console.warn('QR code scan returned empty string');
            return;
        }

        // Implement debouncing to prevent duplicate scans
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            console.log('Scan ignored due to cooldown period');
            return;
        }
        this.lastScanTime = now;

        // Temporarily stop scanning to prevent duplicate scans
        this.pauseScanning();

        try {
            // Show loading
            this.showLoading(true);
            
            console.log('Processing QR code:', qrString);
            
            // Parse QR code data with the cleaned string
            const qrData = this.parseQRCode(qrString);
            if (!qrData) {
                this.showScanResult('error', 'Invalid QR code format', 'This QR code is not recognized as a valid registration code.');
                return;
            }

            console.log('Parsed QR data:', qrData);

            // Verify with backend
            const checkInResult = await this.checkInParticipant(qrData.registrationId);
            
            if (checkInResult.success) {
                if (checkInResult.alreadyCheckedIn) {
                    this.showScanResult('duplicate', 'Already Checked In', 
                        `${checkInResult.participant.firstName} ${checkInResult.participant.lastName} was already checked in at ${checkInResult.checkedInAt}.`,
                        checkInResult.participant);
                } else {
                    this.showScanResult('success', 'Check-in Successful!', 
                        `${checkInResult.participant.firstName} ${checkInResult.participant.lastName} has been checked in.`,
                        checkInResult.participant);
                    
                    // Update stats and recent scans
                    this.addRecentScan(checkInResult.participant);
                    this.stats.checkedIn++;
                    this.updateStats({
                        ...this.stats,
                        attendanceRate: Math.round((this.stats.checkedIn / this.stats.totalRegistered) * 100)
                    });
                }
            } else {
                this.showScanResult('error', 'Check-in Failed', checkInResult.error);
            }

        } catch (error) {
            console.error('Scan processing error:', error);
            this.showScanResult('error', 'Processing Error', 'Failed to process QR code. Please try again.');
        } finally {
            this.showLoading(false);
            // Resume scanning after 3 seconds
            setTimeout(() => {
                this.resumeScanning();
            }, 3000);
        }
    }

    handleScanError(errorMessage) {
        // Ignore common scanning errors (too frequent)
        if (errorMessage.includes('QR code parse error') || 
            errorMessage.includes('No MultiFormat Readers were able to detect the code')) {
            return;
        }
        
        console.warn('QR scan error:', errorMessage);
    }

    parseQRCode(qrCodeMessage) {
        // Additional safety check
        if (!qrCodeMessage || typeof qrCodeMessage !== 'string') {
            console.warn('parseQRCode: Invalid input data type:', typeof qrCodeMessage);
            return null;
        }

        const qrString = qrCodeMessage.trim();
        if (qrString.length === 0) {
            console.warn('parseQRCode: Empty QR code data');
            return null;
        }

        try {
            // Try parsing as JSON first (our format)
            const parsed = JSON.parse(qrString);
            
            // Check for YAH registration format
            if (parsed && typeof parsed === 'object') {
                if (parsed.type === 'YAH_REGISTRATION' && parsed.registrationId) {
                    return { registrationId: parsed.registrationId };
                }
                
                // Check for legacy format
                if (parsed.id && parsed.name && parsed.email) {
                    return { registrationId: parsed.id };
                }
                
                // Check for simple registration data
                if (parsed.registrationId) {
                    return { registrationId: parsed.registrationId };
                }
            }
        } catch (e) {
            // JSON parsing failed, try other formats
            console.log('QR code is not JSON, trying other formats...');
        }

        // Try parsing as simple registration ID (24-character MongoDB ObjectId)
        if (qrString.match(/^[a-f0-9]{24}$/i)) {
            return { registrationId: qrString };
        }
        
        // Try parsing YAH format
        if (qrString.startsWith('YAH-Registration-')) {
            const id = qrString.replace('YAH-Registration-', '');
            if (id && id.length > 0) {
                return { registrationId: id };
            }
        }
        
        // Try URL format (for backward compatibility)
        if (qrString.includes('/verify/') || qrString.includes('/registration/')) {
            try {
                // Extract ID from URL
                const url = new URL(qrString);
                const pathParts = url.pathname.split('/');
                const id = pathParts[pathParts.length - 1];
                if (id && (id.length === 24 || id.length === 8)) {
                    return { registrationId: id };
                }
            } catch (urlError) {
                // Simple extraction fallback
                const parts = qrString.split('/');
                const id = parts[parts.length - 1];
                if (id && (id.length === 24 || id.length === 8)) {
                    return { registrationId: id };
                }
            }
        }
        
        // Try parsing as access code format (8 characters)
        if (qrString.length === 8 && qrString.match(/^[A-Z0-9]{8}$/)) {
            return { registrationId: qrString };
        }
        
        console.warn('parseQRCode: Unrecognized QR code format:', qrString);
        return null;
    }

    async checkInParticipant(registrationId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/scanner/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ registrationId })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                return data.data;
            } else {
                return { success: false, error: data.error || 'Check-in failed' };
            }
            
        } catch (error) {
            console.error('Check-in API error:', error);
            
            // Mock successful check-in for demo
            return {
                success: true,
                alreadyCheckedIn: Math.random() > 0.7,
                participant: {
                    firstName: 'Mock',
                    lastName: 'Participant',
                    email: 'mock@example.com',
                    phone: '+23276123456',
                    registrationId: registrationId
                },
                checkedInAt: new Date().toLocaleTimeString()
            };
        }
    }

    async handleManualEntry(e) {
        e.preventDefault();
        
        const form = e.target;
        const idInput = document.getElementById('registrationId');
        const registrationId = idInput.value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!registrationId) {
            this.showAlert('Please enter a registration ID', 'warning');
            return;
        }

        this.setButtonLoading(submitBtn, true);

        try {
            const checkInResult = await this.checkInParticipant(registrationId);
            
            if (checkInResult.success) {
                if (checkInResult.alreadyCheckedIn) {
                    this.showScanResult('duplicate', 'Already Checked In', 
                        `${checkInResult.participant.firstName} ${checkInResult.participant.lastName} was already checked in.`,
                        checkInResult.participant);
                } else {
                    this.showScanResult('success', 'Manual Check-in Successful!', 
                        `${checkInResult.participant.firstName} ${checkInResult.participant.lastName} has been checked in manually.`,
                        checkInResult.participant);
                    
                    this.addRecentScan(checkInResult.participant, true);
                    this.stats.checkedIn++;
                    this.updateStats({
                        ...this.stats,
                        attendanceRate: Math.round((this.stats.checkedIn / this.stats.totalRegistered) * 100)
                    });
                }
                
                // Clear form
                idInput.value = '';
                
            } else {
                this.showScanResult('error', 'Manual Check-in Failed', checkInResult.error);
            }

        } catch (error) {
            console.error('Manual check-in error:', error);
            this.showAlert('Manual check-in failed. Please try again.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    showScanResult(type, title, message, participant = null) {
        const resultDiv = document.getElementById('scanResult');
        const iconDiv = document.getElementById('resultIcon');
        const messageDiv = document.getElementById('resultMessage');
        const participantDiv = document.getElementById('participantInfo');

        // Clear previous classes
        resultDiv.className = 'scan-result';
        resultDiv.classList.add(type);

        // Set icon based on type
        const icons = {
            success: '<i class="fas fa-check-circle fa-2x text-success"></i>',
            error: '<i class="fas fa-times-circle fa-2x text-danger"></i>',
            duplicate: '<i class="fas fa-exclamation-triangle fa-2x text-warning"></i>'
        };
        
        iconDiv.innerHTML = icons[type] || icons.error;
        messageDiv.innerHTML = `<h6 class="mb-1">${title}</h6><p class="mb-0">${message}</p>`;

        // Show participant info if available
        if (participant) {
            const initials = `${participant.firstName?.[0] || ''}${participant.lastName?.[0] || ''}`.toUpperCase();
            
            document.getElementById('participantAvatar').textContent = initials;
            document.getElementById('participantName').textContent = `${participant.firstName} ${participant.lastName}`;
            document.getElementById('participantEmail').textContent = participant.email;
            document.getElementById('participantId').textContent = `ID: ${participant.registrationId || 'N/A'}`;
            document.getElementById('checkinTime').textContent = new Date().toLocaleTimeString();
            
            participantDiv.style.display = 'block';
        } else {
            participantDiv.style.display = 'none';
        }

        // Show result
        resultDiv.style.display = 'block';

        // Play sound based on result type
        this.playCheckInSound(type);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideScanResult();
        }, 10000);
    }

    hideScanResult() {
        const resultDiv = document.getElementById('scanResult');
        if (resultDiv) {
            resultDiv.style.display = 'none';
        }
    }

    addRecentScan(participant, manual = false) {
        const scan = {
            id: Date.now(),
            participant,
            time: new Date(),
            manual
        };

        this.recentScans.unshift(scan);
        
        // Keep only last 10 scans
        if (this.recentScans.length > 10) {
            this.recentScans = this.recentScans.slice(0, 10);
        }

        this.updateRecentScansDisplay();
    }

    updateRecentScansDisplay() {
        const container = document.getElementById('recentScans');
        
        if (this.recentScans.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-3">No check-ins yet</div>';
            return;
        }

        container.innerHTML = this.recentScans.map(scan => {
            const initials = `${scan.participant.firstName?.[0] || ''}${scan.participant.lastName?.[0] || ''}`.toUpperCase();
            const timeStr = scan.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const method = scan.manual ? 'Manual' : 'QR Scan';
            
            return `
                <div class="scan-item">
                    <div class="participant-avatar me-3" style="width: 40px; height: 40px; font-size: 0.9rem;">${initials}</div>
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${scan.participant.firstName} ${scan.participant.lastName}</div>
                        <div class="scan-time">${timeStr} • ${method}</div>
                    </div>
                    <i class="fas fa-check text-success"></i>
                </div>
            `;
        }).join('');
    }

    pauseScanning() {
        try {
            if (this.scanner && typeof this.scanner.pause === 'function') {
                this.scanner.pause();
            }
        } catch (error) {
            console.warn('Error pausing scanner:', error);
        }
    }

    resumeScanning() {
        try {
            if (this.scanner && typeof this.scanner.resume === 'function' && this.isScanning) {
                this.scanner.resume();
            }
        } catch (error) {
            console.warn('Error resuming scanner:', error);
        }
    }

    playCheckInSound(type) {
        try {
            // Create audio context for different sounds
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (type === 'success') {
                // Success: Two ascending beeps
                this.playBeep(audioContext, 800, 200);
                setTimeout(() => this.playBeep(audioContext, 1000, 200), 250);
            } else if (type === 'duplicate') {
                // Duplicate: Single medium beep
                this.playBeep(audioContext, 600, 400);
            } else {
                // Error: Two descending beeps
                this.playBeep(audioContext, 400, 200);
                setTimeout(() => this.playBeep(audioContext, 300, 200), 250);
            }
        } catch (error) {
            // Ignore audio errors
            console.warn('Audio playback not supported:', error);
        }
    }

    playBeep(audioContext, frequency, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }

    startAutoRefresh() {
        if (this.isAuthenticated) {
            setInterval(() => {
                this.loadStats();
            }, 30000); // Refresh every 30 seconds
        }
    }

    logout() {
        sessionStorage.removeItem('yah_scanner_auth');
        this.isAuthenticated = false;
        
        if (this.isScanning) {
            this.stopScanning();
        }
        
        // Reset UI
        document.getElementById('authGate').style.display = 'block';
        document.getElementById('scannerInterface').style.display = 'none';
        document.getElementById('staffCode').value = '';
        
        // Clear data
        this.recentScans = [];
        this.stats = { checkedIn: 0, totalRegistered: 0, attendanceRate: 0 };
        
        this.showAuthAlert('Logged out successfully', 'info');
    }

    // Utility Methods
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const loadingSpinner = button.querySelector('.loading-spinner');

        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (loadingSpinner) loadingSpinner.style.display = 'inline';
            button.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'inline';
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            button.disabled = false;
        }
    }

    showAlert(message, type = 'info', duration = 5000) {
        const alertClass = type === 'success' ? 'alert-success' : 
                         type === 'error' ? 'alert-danger' : 
                         type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }

    showAuthAlert(message, type = 'info') {
        const alertArea = document.getElementById('authAlert');
        if (!alertArea) return;

        const alertClass = `alert-${type}`;
        alertArea.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        if (type === 'success') {
            setTimeout(() => {
                alertArea.innerHTML = '';
            }, 3000);
        }
    }

    clearAuthAlert() {
        const alertArea = document.getElementById('authAlert');
        if (alertArea) {
            alertArea.innerHTML = '';
        }
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize scanner when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('scannerInterface')) {
        // Add global error handler for uncaught errors
        window.addEventListener('error', function(event) {
            if (event.message && event.message.includes('undefined is not an object')) {
                console.error('Caught HTML5-QRCode error:', event.message, event.error);
                
                // If we have a scanner instance, show error
                if (window.eventScanner && window.eventScanner.isScanning) {
                    window.eventScanner.showScanResult('error', 'Scanner Error', 
                        'QR scanner encountered an error. Please restart the scanner.');
                }
                
                // Prevent the error from propagating
                event.preventDefault();
                return false;
            }
        });
        
        // Add unhandled promise rejection handler
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && event.reason.message && 
                event.reason.message.includes('undefined is not an object')) {
                console.error('Caught HTML5-QRCode promise rejection:', event.reason);
                
                if (window.eventScanner && window.eventScanner.isScanning) {
                    window.eventScanner.showScanResult('error', 'Scanner Error', 
                        'QR scanner encountered an error. Please restart the scanner.');
                }
                
                event.preventDefault();
                return false;
            }
        });
        
        window.eventScanner = new EventScanner();
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventScanner;
}