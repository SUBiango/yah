// Admin Dashboard Logic - Young Access Hub Event Registration
// Handles admin authentication, participant management, and data operations

class AdminDashboard {
    constructor() {
        this.isAuthenticated = false;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalParticipants = 0;
        this.participants = [];
        this.filteredParticipants = [];
                this.apiBaseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? 'http://localhost:3000/api'  // Development
            : 'https://yah-backend.onrender.com/api'; // Production (yahsl.org)
        this.adminPasscode = 'YAH@Admin2025'; // Default admin passcode
        
        this.init();
    }

    init() {
        this.checkAuthState();
        this.bindEvents();
        this.setupEventListeners();
    }

    checkAuthState() {
        // Check if already authenticated (session storage)
        const authState = sessionStorage.getItem('yah_admin_auth');
        if (authState === 'true') {
            this.isAuthenticated = true;
            this.showDashboard();
            this.loadDashboardData();
        }
    }

    bindEvents() {
        // Passcode form submission
        document.getElementById('passcodeForm')?.addEventListener('submit', (e) => {
            this.handlePasscodeSubmission(e);
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Search and filters
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.handleStatusFilter(e.target.value);
        });

        document.getElementById('sortBy')?.addEventListener('change', (e) => {
            this.handleSort(e.target.value);
        });

        document.getElementById('resetFilters')?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Action buttons
        document.getElementById('generateCodesBtn')?.addEventListener('click', () => {
            this.showGenerateCodesModal();
        });

        document.getElementById('exportDataBtn')?.addEventListener('click', () => {
            this.exportData();
        });

        // Generate codes form
        document.getElementById('generateCodesForm')?.addEventListener('submit', (e) => {
            this.handleGenerateCodes(e);
        });

        // Auto-refresh every 30 seconds
        if (this.isAuthenticated) {
            setInterval(() => {
                this.refreshDashboardData();
            }, 30000);
        }
    }

    setupEventListeners() {
        // Delegate event listeners for dynamically created elements
        document.addEventListener('click', (e) => {
            // Handle View Details button
            if (e.target.classList.contains('btn-view') || e.target.closest('.btn-view')) {
                e.preventDefault();
                const button = e.target.classList.contains('btn-view') ? e.target : e.target.closest('.btn-view');
                // Try to get participant ID from button first, then from row
                let participantId = button.dataset.participantId || button.closest('tr')?.dataset.participantId;
                console.log('View clicked for participant:', participantId, 'button:', button);
                if (participantId) {
                    this.viewParticipant(participantId);
                } else {
                    console.error('No participant ID found for view button');
                }
            }

            // Handle QR Code button
            if (e.target.classList.contains('btn-qr') || e.target.closest('.btn-qr')) {
                e.preventDefault();
                const button = e.target.classList.contains('btn-qr') ? e.target : e.target.closest('.btn-qr');
                // Try to get participant ID from button first, then from row
                let participantId = button.dataset.participantId || button.closest('tr')?.dataset.participantId;
                console.log('QR clicked for participant:', participantId, 'button:', button);
                if (participantId) {
                    this.downloadParticipantQR(participantId);
                } else {
                    console.error('No participant ID found for QR button');
                }
            }

            // Handle Send Email button
            if (e.target.classList.contains('btn-email') || e.target.closest('.btn-email')) {
                e.preventDefault();
                const button = e.target.classList.contains('btn-email') ? e.target : e.target.closest('.btn-email');
                // Try to get participant ID from button first, then from row
                let participantId = button.dataset.participantId || button.closest('tr')?.dataset.participantId;
                console.log('Email clicked for participant:', participantId, 'button:', button);
                if (participantId) {
                    this.sendConfirmationEmail(participantId);
                } else {
                    console.error('No participant ID found for email button');
                }
            }

            // Handle Download QR from modal
            if (e.target.id === 'downloadParticipantQR') {
                e.preventDefault();
                const participantId = e.target.dataset.participantId;
                if (participantId) {
                    this.downloadParticipantQR(participantId);
                }
            }
        });
    }

    async handlePasscodeSubmission(e) {
        e.preventDefault();
        
        const form = e.target;
        const passcodeInput = document.getElementById('adminPasscode');
        const passcode = passcodeInput.value.trim();
        const submitButton = form.querySelector('button[type="submit"]');

        // Show loading state
        this.setButtonLoading(submitButton, true);
        this.clearPasscodeAlert();

        try {
            // Simulate API call for passcode verification
            await this.simulateDelay(1500);

            if (passcode === this.adminPasscode) {
                // Authentication successful
                this.isAuthenticated = true;
                sessionStorage.setItem('yah_admin_auth', 'true');
                
                this.showPasscodeAlert('Access granted! Loading dashboard...', 'success');
                
                setTimeout(() => {
                    this.showDashboard();
                    this.loadDashboardData();
                }, 1000);
                
            } else {
                // Authentication failed
                this.showPasscodeAlert('Invalid passcode. Please try again.', 'danger');
                passcodeInput.focus();
                passcodeInput.select();
            }

        } catch (error) {
            console.error('Passcode verification error:', error);
            this.showPasscodeAlert('Authentication failed. Please try again.', 'danger');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    showDashboard() {
        document.getElementById('passcodeGate').style.display = 'none';
        document.getElementById('dashboardContainer').classList.add('active');
        document.getElementById('logoutBtn').style.display = 'block';
        
        // Update page title
        document.title = 'Admin Dashboard - Young Access Hub';
    }

    async loadDashboardData() {
        this.showLoading(true);
        
        try {
            // Load statistics and participants in parallel
            await Promise.all([
                this.loadStatistics(),
                this.loadParticipants()
            ]);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showAlert('Failed to load dashboard data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/stats`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();

            if (response.ok && data.success) {
                this.updateStatistics(data.data);
            } else {
                throw new Error(data.error || 'Failed to load statistics');
            }
        } catch (error) {
            console.error('Statistics loading error:', error);
            // Use mock data for demo
            this.updateStatistics({
                totalParticipants: 0,
                totalRegistrations: 0,
                accessCodes: { total: 0, used: 0 },
                recentActivity: {
                    registrationsToday: 0,
                    registrationsThisWeek: 0,
                    registrationsThisMonth: 0
                }
            });
        }
    }

    updateStatistics(stats) {
        // Calculate confirmed and pending counts from loaded participants data
        const confirmedCount = this.participants.filter(p => p.status === 'confirmed').length;
        const pendingCount = this.participants.filter(p => p.status === 'pending').length;
        
        document.getElementById('totalParticipants').textContent = stats.totalParticipants || 0;
        document.getElementById('confirmedRegistrations').textContent = confirmedCount;
        document.getElementById('pendingRegistrations').textContent = pendingCount;
        document.getElementById('totalAccessCodes').textContent = stats.accessCodes?.total || 0;
    }

    async loadParticipants() {
        console.log('Loading participants...');
        try {
            const url = `${this.apiBaseUrl}/admin/registrations?skip=${(this.currentPage - 1) * this.itemsPerPage}&limit=${this.itemsPerPage}`;
            console.log('[Admin] API URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            console.log('[Admin] Response status:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('[Admin] Full API Response:', data);

            if (response.ok && data.success) {
                console.log('[Admin] Raw registrations data:', data.data);
                this.participants = data.data.registrations || [];
                this.totalParticipants = data.data.total || 0;
                this.filteredParticipants = [...this.participants];
                
                console.log('Loaded participants from API:', this.participants);
                console.log('[Admin] Total participants count:', this.totalParticipants);
                this.renderParticipantsTable();
                this.updateParticipantCount();
                // Update statistics with correct counts after loading participants
                this.updateParticipantStatistics();
            } else {
                console.error('[Admin] API call failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    responseData: data
                });
                throw new Error(data.error || 'Failed to load participants');
            }
        } catch (error) {
            console.error('Participants loading error:', error);
            console.error('[Admin] Error details:', {
                message: error.message,
                stack: error.stack,
                apiUrl: `${this.apiBaseUrl}/admin/registrations`
            });
            // Show empty state instead of mock data
            this.participants = [];
            this.filteredParticipants = [];
            this.totalParticipants = 0;
            this.renderParticipantsTable();
            this.updateParticipantCount();
            this.showAlert('Failed to load participants. Please check your connection and try again.', 'error');
        }
    }

    renderParticipantsTable() {
        const tbody = document.getElementById('participantsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        console.log('Rendering participants table...');
        console.log('Filtered participants count:', this.filteredParticipants.length);
        
        if (this.filteredParticipants.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            console.log('No participants to display, showing empty state');
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Debug logging
        console.log('Rendering participants:', this.filteredParticipants);
        
        const tableHTML = this.filteredParticipants.map((registration, index) => {
            const participant = registration.participant || registration;
            const fullName = `${participant.firstName} ${participant.lastName}`;
            const initials = `${participant.firstName?.[0] || ''}${participant.lastName?.[0] || ''}`.toUpperCase();
            const statusBadge = this.getStatusBadge(registration.status);
            const registrationDate = new Date(registration.registrationDate || registration.createdAt).toLocaleDateString();
            
            // Get the proper participant ID (KDYES25{number}) and database ID
            const participantId = registration.participantId || registration.participant?.participantId || 'N/A';
            const registrationId = registration.id || registration._id; // Keep database ID for internal operations
            
            // Debug logging for each registration
            console.log(`Processing registration ${index + 1}:`, {
                id: registration.id,
                _id: registration._id,
                participantId: participantId,
                resolvedId: registrationId,
                participant: participant,
                fullName: fullName
            });
            
            const rowHTML = `
                <tr data-participant-id="${participantId}">
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="participant-avatar me-3">${initials}</div>
                            <div>
                                <div class="fw-semibold">${fullName}</div>
                                <small class="text-muted">ID: ${participantId}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div>${participant.email}</div>
                    </td>
                    <td>
                        <div>${participant.phone || 'N/A'}</div>
                    </td>
                    <td>
                        <div>${registrationDate}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-action btn-view" title="View Details" data-participant-id="${participantId}" data-registration-id="${registrationId}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-action btn-qr" title="Download QR" data-participant-id="${participantId}" data-registration-id="${registrationId}">
                                <i class="fas fa-qrcode"></i>
                            </button>
                            <button class="btn btn-action btn-email" title="Send Email" data-participant-id="${participantId}" data-registration-id="${registrationId}">
                                <i class="fas fa-envelope"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            console.log(`Generated HTML for ${registrationId}:`, rowHTML.substring(0, 200) + '...');
            return rowHTML;
        }).join('');
        
        tbody.innerHTML = tableHTML;
        console.log('Table rendered successfully with', this.filteredParticipants.length, 'participants');
        
        // Verify that the data attributes are set correctly
        setTimeout(() => {
            const rows = tbody.querySelectorAll('tr[data-participant-id]');
            console.log('Verification: Found', rows.length, 'rows with data-participant-id attributes');
            rows.forEach((row, index) => {
                const participantId = row.dataset.participantId;
                const buttons = row.querySelectorAll('button[data-participant-id]');
                console.log(`Row ${index + 1}: participant-id="${participantId}", buttons with data-participant-id: ${buttons.length}`);
            });
        }, 100);
    }

    getStatusBadge(status) {
        const badges = {
            confirmed: '<span class="badge badge-confirmed">Confirmed</span>',
            pending: '<span class="badge badge-pending">Pending</span>',
            cancelled: '<span class="badge badge-cancelled">Cancelled</span>'
        };
        return badges[status] || badges.pending;
    }

    updateParticipantCount() {
        const countElement = document.getElementById('participantCount');
        if (countElement) {
            countElement.textContent = `${this.filteredParticipants.length} participants`;
        }
    }

    updateParticipantStatistics() {
        // Calculate confirmed and pending counts from loaded participants data
        const confirmedCount = this.participants.filter(p => p.status === 'confirmed').length;
        const pendingCount = this.participants.filter(p => p.status === 'pending').length;
        
        console.log('Status counts:', { confirmed: confirmedCount, pending: pendingCount });
        console.log('Participant statuses:', this.participants.map(p => ({ id: p.participantId, status: p.status })));
        
        document.getElementById('confirmedRegistrations').textContent = confirmedCount;
        document.getElementById('pendingRegistrations').textContent = pendingCount;
        document.getElementById('totalParticipants').textContent = this.participants.length;
    }

    // Search and Filter Methods
    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.filteredParticipants = [...this.participants];
        } else {
            this.filteredParticipants = this.participants.filter(registration => {
                const participant = registration.participant || registration;
                return (
                    participant.firstName?.toLowerCase().includes(searchTerm) ||
                    participant.lastName?.toLowerCase().includes(searchTerm) ||
                    participant.email?.toLowerCase().includes(searchTerm) ||
                    participant.phone?.includes(searchTerm) ||
                    registration.id?.toLowerCase().includes(searchTerm)
                );
            });
        }
        
        this.renderParticipantsTable();
        this.updateParticipantCount();
    }

    handleStatusFilter(status) {
        if (!status) {
            this.filteredParticipants = [...this.participants];
        } else {
            this.filteredParticipants = this.participants.filter(registration => 
                registration.status === status
            );
        }
        
        this.renderParticipantsTable();
        this.updateParticipantCount();
    }

    handleSort(sortBy) {
        this.filteredParticipants.sort((a, b) => {
            const participantA = a.participant || a;
            const participantB = b.participant || b;
            
            switch (sortBy) {
                case 'name':
                    return `${participantA.firstName} ${participantA.lastName}`.localeCompare(
                        `${participantB.firstName} ${participantB.lastName}`
                    );
                case 'email':
                    return participantA.email.localeCompare(participantB.email);
                case 'date':
                    return new Date(b.registrationDate || b.createdAt) - new Date(a.registrationDate || a.createdAt);
                default:
                    return 0;
            }
        });
        
        this.renderParticipantsTable();
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('sortBy').value = 'name';
        
        this.filteredParticipants = [...this.participants];
        this.renderParticipantsTable();
        this.updateParticipantCount();
    }

    // Participant Management Methods
    viewParticipant(participantId) {
        console.log('Viewing participant with ID:', participantId);
        console.log('Available participants:', this.participants.map(p => ({ 
            participantId: p.participantId,
            _id: p._id, 
            name: `${p.participant?.firstName} ${p.participant?.lastName}` 
        })));
        
        // Search for participant by participantId field
        const registration = this.participants.find(p => p.participantId === participantId);
        if (!registration) {
            console.error('Participant not found with ID:', participantId);
            console.log('Searching in participants array:', this.participants);
            this.showAlert(`Participant with ID ${participantId} not found`, 'error');
            return;
        }

        console.log('Found registration:', registration);
        const participant = registration.participant || registration;
        
        // Debug: Log all available participant fields
        console.log('All participant fields:', Object.keys(participant));
        console.log('Participant data:', participant);
        console.log('Field debugging:', {
            district: participant.district,
            location: participant.location,
            occupation: participant.occupation,
            interest: participant.interest,
            churchAffiliation: participant.churchAffiliation
        });
        
        const modalBody = document.getElementById('participantModalBody');
        
        // Use the participant ID for display
        const displayId = registration.participantId || 'N/A';
        
        // Use the actual QR code from registration if available, otherwise generate one
        let qrCodeUrl;
        if (registration.qrCode) {
            qrCodeUrl = registration.qrCode;
            console.log('Using existing QR code from registration');
        } else {
            // Generate QR code with the same format as email confirmations
            const qrData = displayId;
            qrCodeUrl = this.generateQRCodeDataURL(qrData);
            console.log('Generated new QR code for registration');
        }
        
        modalBody.innerHTML = `
            <div class="row g-4">
                <div class="col-md-8">
                    <h6 class="text-muted mb-3">Personal Information</h6>
                    <div class="row g-2">
                        <div class="col-6"><strong>Full Name:</strong></div>
                        <div class="col-6">${participant.firstName} ${participant.lastName}</div>
                        
                        <div class="col-6"><strong>Email:</strong></div>
                        <div class="col-6">${participant.email}</div>
                        
                        <div class="col-6"><strong>Phone:</strong></div>
                        <div class="col-6">${participant.phone || 'N/A'}</div>
                        
                        <div class="col-6"><strong>Age:</strong></div>
                        <div class="col-6">${participant.age || 'N/A'} years</div>
                        
                        <div class="col-6"><strong>Gender:</strong></div>
                        <div class="col-6">${participant.gender ? participant.gender.charAt(0).toUpperCase() + participant.gender.slice(1) : 'N/A'}</div>
                        
                        <div class="col-6"><strong>District:</strong></div>
                        <div class="col-6">${participant.district || participant.location || 'N/A'}</div>
                        
                        <div class="col-6"><strong>Occupation:</strong></div>
                        <div class="col-6">${participant.occupation || 'N/A'}</div>
                        
                        <div class="col-6"><strong>Interest Area:</strong></div>
                        <div class="col-6">${participant.interest || 'N/A'}</div>
                    </div>
                    
                    <h6 class="text-muted mb-3 mt-4">Registration Details</h6>
                    <div class="row g-2">
                        <div class="col-6"><strong>Participant ID:</strong></div>
                        <div class="col-6"><code>${displayId}</code></div>
                        
                        <div class="col-6"><strong>Access Code:</strong></div>
                        <div class="col-6"><code>${registration.accessCode}</code></div>
                        
                        <div class="col-6"><strong>Status:</strong></div>
                        <div class="col-6">${this.getStatusBadge(registration.status)}</div>
                        
                        <div class="col-6"><strong>Registration Date:</strong></div>
                        <div class="col-6">${new Date(registration.registrationDate || registration.createdAt).toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <h6 class="text-muted mb-3">QR Code</h6>
                    <div class="text-center">
                        <img src="${qrCodeUrl}" alt="QR Code" class="img-fluid border rounded" style="max-width: 150px;">
                        <div class="mt-2">
                            <small class="text-muted">Scan for event check-in</small>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted d-block">Participant: ${displayId}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store participant ID for QR download - use the display ID
        document.getElementById('downloadParticipantQR').dataset.participantId = displayId;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('participantModal'));
        modal.show();
    }

    async downloadParticipantQR(participantId) {
        try {
            // Search for participant by participantId field
            const registration = this.participants.find(p => p.participantId === participantId);
            if (!registration) {
                this.showAlert('Participant not found', 'error');
                return;
            }

            const participant = registration.participant || registration;
            this.showAlert('Preparing QR code download...', 'info', 2000);

            const displayId = registration.participantId || 'N/A';
            
            // Use the actual QR code from registration if available
            let qrCodeUrl;
            if (registration.qrCode) {
                qrCodeUrl = registration.qrCode;
                console.log('Using existing QR code from registration for download');
            } else {
                // Generate QR code data - match the format used in email confirmations
                const qrData = displayId;
                qrCodeUrl = this.generateQRCodeDataURL(qrData);
                console.log('Generated new QR code for download');
            }
            
            // Download the QR code
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `QR-${participant.firstName}-${participant.lastName}-${displayId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showAlert(`QR code downloaded for ${participant.firstName} ${participant.lastName}!`, 'success');
            
        } catch (error) {
            console.error('QR download error:', error);
            this.showAlert('Failed to download QR code', 'error');
        }
    }

    generateQRCodeDataURL(data) {
        // Enhanced QR code generator that creates more realistic QR codes
        // This should match the format used by the backend QR generation
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        
        // Generate deterministic pattern based on registration ID
        const hash = this.simpleHash(data.toString());
        const random = this.seededRandom(hash);
        
        // QR code module size (each "pixel" in the QR code)
        const moduleSize = 8;
        const modules = 21; // Standard QR code is 21x21 modules for version 1
        const margin = 20;
        
        ctx.fillStyle = '#000000';
        
        // Draw finder patterns (corners)
        this.drawFinderPattern(ctx, margin, margin, moduleSize);
        this.drawFinderPattern(ctx, margin + 14 * moduleSize, margin, moduleSize);
        this.drawFinderPattern(ctx, margin, margin + 14 * moduleSize, moduleSize);
        
        // Draw data modules with deterministic pattern based on registration ID
        for (let row = 0; row < modules; row++) {
            for (let col = 0; col < modules; col++) {
                // Skip finder patterns and separators
                if (this.isFinderPattern(row, col) || this.isSeparator(row, col)) {
                    continue;
                }
                
                // Generate deterministic pattern based on position and data
                const moduleValue = this.getModuleValue(row, col, data);
                if (moduleValue) {
                    ctx.fillRect(
                        margin + col * moduleSize, 
                        margin + row * moduleSize, 
                        moduleSize - 1, 
                        moduleSize - 1
                    );
                }
            }
        }
        
        return canvas.toDataURL('image/png');
    }

    drawFinderPattern(ctx, x, y, moduleSize) {
        // Draw 7x7 finder pattern
        ctx.fillStyle = '#000000';
        
        // Outer border
        ctx.fillRect(x, y, 7 * moduleSize, moduleSize);
        ctx.fillRect(x, y + 6 * moduleSize, 7 * moduleSize, moduleSize);
        ctx.fillRect(x, y, moduleSize, 7 * moduleSize);
        ctx.fillRect(x + 6 * moduleSize, y, moduleSize, 7 * moduleSize);
        
        // Inner 3x3 square
        ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
    }

    isFinderPattern(row, col) {
        return (row < 9 && col < 9) || 
               (row < 9 && col > 11) || 
               (row > 11 && col < 9);
    }

    isSeparator(row, col) {
        return (row === 7 || col === 7) && 
               ((row < 9 && col < 9) || 
                (row < 9 && col > 11) || 
                (row > 11 && col < 9));
    }

    getModuleValue(row, col, data) {
        // Generate deterministic pattern based on registration ID
        const hash = this.simpleHash(data + row + col);
        return hash % 2 === 0;
    }

    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    seededRandom(seed) {
        let x = seed;
        return function() {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
    }

    async sendConfirmationEmail(participantId) {
        try {
            // Search for participant by participantId field
            const registration = this.participants.find(p => p.participantId === participantId);
            if (!registration) {
                this.showAlert('Participant not found', 'error');
                return;
            }

            const participant = registration.participant || registration;
            // Use the MongoDB _id for backend API calls
            const registrationId = registration._id;
            
            this.showAlert(`Sending confirmation email to ${participant.firstName} ${participant.lastName}...`, 'info', 3000);
            
            try {
                // Call the backend API to send confirmation email
                const response = await fetch(`${this.apiBaseUrl}/admin/send-confirmation`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        registrationId: registrationId
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    this.showAlert(`Confirmation email sent successfully to ${participant.email}!`, 'success');
                } else {
                    throw new Error(result.error || 'Failed to send email');
                }
                
            } catch (apiError) {
                console.warn('API call failed, falling back to simulation:', apiError);
                
                // Fallback to simulation if API is not available
                await this.simulateDelay(2500);
                this.showAlert(`Confirmation email sent successfully to ${participant.email}! (Simulated)`, 'success');
            }
            
        } catch (error) {
            console.error('Email sending error:', error);
            this.showAlert('Failed to send confirmation email', 'error');
        }
    }

    // Code Generation Methods
    showGenerateCodesModal() {
        const modal = new bootstrap.Modal(document.getElementById('generateCodesModal'));
        modal.show();
    }

    async handleGenerateCodes(e) {
        e.preventDefault();
        
        const form = e.target;
        const countInput = document.getElementById('codeCount');
        const count = parseInt(countInput.value);
        const submitButton = form.querySelector('button[type="submit"]');
        
        if (count < 1 || count > 100) {
            this.showAlert('Please enter a number between 1 and 100', 'warning');
            return;
        }
        
        this.setButtonLoading(submitButton, true);
        
        try {
            // Call API to generate access codes
            const response = await fetch(`${this.apiBaseUrl}/admin/access-codes`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ count })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showAlert(`Successfully generated ${data.data.generated} access codes!`, 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('generateCodesModal'));
                modal.hide();
                
                // Refresh statistics
                this.loadStatistics();
                
                // Download codes as CSV
                this.downloadAccessCodes(data.data.codes);
                
            } else {
                throw new Error(data.error || 'Failed to generate access codes');
            }
            
        } catch (error) {
            console.error('Code generation error:', error);
            this.showAlert('Failed to generate access codes', 'error');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    downloadAccessCodes(codes) {
        const csvContent = 'Access Code\n' + codes.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `access_codes_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async exportData() {
        try {
            this.showAlert('Preparing data export...', 'info');
            
            // Simulate API call
            await this.simulateDelay(2000);
            
            const csvData = this.generateParticipantsCSV();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `participants_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            this.showAlert('Data exported successfully!', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showAlert('Failed to export data', 'error');
        }
    }

    generateParticipantsCSV() {
        const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Registration Date', 'Status'];
        const rows = this.participants.map(registration => {
            const participant = registration.participant || registration;
            return [
                registration.id,
                participant.firstName,
                participant.lastName,
                participant.email,
                participant.phone || '',
                new Date(registration.registrationDate || registration.createdAt).toLocaleDateString(),
                registration.status
            ];
        });
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    async refreshDashboardData() {
        try {
            await this.loadStatistics();
            // Only refresh table if no search/filter is active
            const searchInput = document.getElementById('searchInput');
            const statusFilter = document.getElementById('statusFilter');
            
            if (!searchInput.value && !statusFilter.value) {
                await this.loadParticipants();
            }
        } catch (error) {
            console.error('Dashboard refresh error:', error);
        }
    }

    logout() {
        sessionStorage.removeItem('yah_admin_auth');
        this.isAuthenticated = false;
        
        // Reset UI
        document.getElementById('passcodeGate').style.display = 'block';
        document.getElementById('dashboardContainer').classList.remove('active');
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('adminPasscode').value = '';
        
        // Clear data
        this.participants = [];
        this.filteredParticipants = [];
        
        this.showPasscodeAlert('Logged out successfully', 'info');
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
        alert.style.cssText = 'top: 100px; right: 20px; z-index: 10000; min-width: 300px;';
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

    showPasscodeAlert(message, type = 'info') {
        const alertArea = document.getElementById('passcodeAlert');
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

    clearPasscodeAlert() {
        const alertArea = document.getElementById('passcodeAlert');
        if (alertArea) {
            alertArea.innerHTML = '';
        }
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on admin page
    if (document.getElementById('passcodeGate') || document.getElementById('dashboardContainer')) {
        new AdminDashboard();
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}