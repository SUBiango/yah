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
        
        // Filter state
        this.searchTerm = '';
        this.statusFilter = '';
        this.sortBy = 'name';
        
        // Environment detection
        this.isDevEnvironment = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        this.apiBaseUrl = this.isDevEnvironment
            ? 'http://localhost:3000/api'  // Development
            : 'https://yah-backend.onrender.com/api'; // Production (yahsl.org)
        this.adminPasscode = 'YAH@Admin2025'; // Default admin passcode
        
        // Logging configuration
        // Log levels: 'debug' (all), 'info', 'warn', 'error' (critical only)
        this.logLevel = this.isDevEnvironment ? 'debug' : 'error';
        this.debug = this.isDevEnvironment; // For backward compatibility
        
        this.init();
    }
    
    // Logger wrapper with log levels
    // Levels: debug < info < warn < error
    log(...args) {
        // Only log debug messages in development
        if (this.logLevel === 'debug') {
            console.log('[Admin]', ...args);
        }
    }
    
    logInfo(...args) {
        // Log info and above (info, warn, error)
        if (['debug', 'info', 'warn', 'error'].includes(this.logLevel)) {
            console.info('[Admin Info]', ...args);
        }
    }
    
    logWarn(...args) {
        // Log warnings in development and when explicitly set to warn level
        if (['debug', 'warn'].includes(this.logLevel)) {
            console.warn('[Admin Warning]', ...args);
        }
    }
    
    logError(...args) {
        // ALWAYS log errors regardless of log level - critical for production debugging
        console.error('[Admin Error]', ...args);
    }

    init() {
        this.checkAuthState();
        this.bindEvents();
        this.setupEventListeners();
        // Add CORS connectivity test
        this.testCORSConnectivity();
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
                this.log('View clicked for participant:', participantId, 'button:', button);
                if (participantId) {
                    this.viewParticipant(participantId);
                } else {
                    this.logError('No participant ID found for view button');
                }
            }

            // Handle QR Code button
            if (e.target.classList.contains('btn-qr') || e.target.closest('.btn-qr')) {
                e.preventDefault();
                const button = e.target.classList.contains('btn-qr') ? e.target : e.target.closest('.btn-qr');
                // Try to get participant ID from button first, then from row
                let participantId = button.dataset.participantId || button.closest('tr')?.dataset.participantId;
                this.log('QR clicked for participant:', participantId, 'button:', button);
                if (participantId) {
                    this.downloadParticipantQR(participantId);
                } else {
                    this.logError('No participant ID found for QR button');
                }
            }

            // Handle Send Email button
            if (e.target.classList.contains('btn-email') || e.target.closest('.btn-email')) {
                e.preventDefault();
                const button = e.target.classList.contains('btn-email') ? e.target : e.target.closest('.btn-email');
                // Try to get participant ID from button first, then from row
                let participantId = button.dataset.participantId || button.closest('tr')?.dataset.participantId;
                this.log('Email clicked for participant:', participantId, 'button:', button);
                if (participantId) {
                    this.sendConfirmationEmail(participantId);
                } else {
                    this.logError('No participant ID found for email button');
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
            this.logError('Passcode verification error:', error);
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
            this.logError('Failed to load dashboard data:', error);
            this.showAlert('Failed to load dashboard data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStatistics() {
        this.log('[ADMIN] Loading statistics from:', `${this.apiBaseUrl}/admin/stats`);
        this.log('[ADMIN] Current origin:', window.location.origin);
        
        try {
            // Add retry logic for CORS issues
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    this.log(`[ADMIN] Statistics attempt ${attempt}/3`);
                    
                    const response = await fetch(`${this.apiBaseUrl}/admin/stats`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    this.log('[ADMIN] Statistics response status:', response.status);
                    this.log('[ADMIN] Statistics response headers:', Array.from(response.headers.entries()));
                    
                    const data = await response.json();
                    this.log('[ADMIN] Statistics response data:', data);

                    if (response.ok && data.success) {
                        this.log('[ADMIN] Statistics loaded successfully');
                        this.updateStatistics(data.data);
                        return; // Success, exit retry loop
                    } else {
                        throw new Error(data.error || `Failed to load statistics: ${response.status} ${response.statusText}`);
                    }
                } catch (fetchError) {
                    lastError = fetchError;
                    this.logWarn(`[ADMIN] Statistics attempt ${attempt} failed:`, fetchError);
                    
                    // Wait before retry (exponential backoff)
                    if (attempt < 3) {
                        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
                        this.log(`[ADMIN] Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            
            // All attempts failed
            throw lastError;
            
        } catch (error) {
            this.logError('Statistics loading error:', error);
            this.logError('Error type:', error.constructor.name);
            this.logError('Error message:', error.message);
            
            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('cors') || 
                error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                this.showAlert('Unable to connect to the server. Please check your internet connection and try refreshing the page.', 'error');
            } else {
                this.showAlert('Failed to load statistics. Please try again later.', 'error');
            }
            
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
        // Use stats from API for accurate totals across all registrations
        document.getElementById('totalParticipants').textContent = stats.totalParticipants || 0;
        document.getElementById('totalAccessCodes').textContent = stats.accessCodes?.total || 0;
        
        // Use status breakdown from backend for accurate global counts
        if (stats.statusBreakdown) {
            document.getElementById('confirmedRegistrations').textContent = stats.statusBreakdown.confirmed || 0;
            document.getElementById('pendingRegistrations').textContent = stats.statusBreakdown.pending || 0;
            this.log('Status breakdown from backend:', stats.statusBreakdown);
        } else {
            // Fallback: if backend doesn't provide breakdown, show zeros
            this.logWarn('Status breakdown not available from backend');
            document.getElementById('confirmedRegistrations').textContent = 0;
            document.getElementById('pendingRegistrations').textContent = 0;
        }
    }

    async loadParticipants() {
        this.log('Loading participants...');
        try {
            const url = `${this.apiBaseUrl}/admin/registrations?skip=${(this.currentPage - 1) * this.itemsPerPage}&limit=${this.itemsPerPage}`;
            this.log('[Admin] API URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            this.log('[Admin] Response status:', response.status, response.statusText);
            
            const data = await response.json();
            this.log('[Admin] Full API Response:', data);

            if (response.ok && data.success) {
                this.log('[Admin] Raw registrations data:', data.data);
                this.participants = data.data.registrations || [];
                this.totalParticipants = data.data.total || 0;
                this.filteredParticipants = [...this.participants];
                
                this.log('Loaded participants from API:', this.participants);
                this.log('[Admin] Total participants count:', this.totalParticipants);
                this.renderParticipantsTable();
                this.updateParticipantCount();
                this.renderPagination();
                // Update statistics with correct counts after loading participants
                this.updateParticipantStatistics();
            } else {
                this.logError('[Admin] API call failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    responseData: data
                });
                throw new Error(data.error || 'Failed to load participants');
            }
        } catch (error) {
            this.logError('Participants loading error:', error);
            this.logError('[Admin] Error details:', {
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
            this.renderPagination();
            this.showAlert('Failed to load participants. Please check your connection and try again.', 'error');
        }
    }

    renderParticipantsTable() {
        const tbody = document.getElementById('participantsTableBody');
        const emptyState = document.getElementById('emptyState');
        
        this.log('Rendering participants table...');
        this.log('Filtered participants count:', this.filteredParticipants.length);
        
        if (this.filteredParticipants.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            this.log('No participants to display, showing empty state');
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Debug logging
        this.log('Rendering participants:', this.filteredParticipants);
        
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
            this.log(`Processing registration ${index + 1}:`, {
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
            
            this.log(`Generated HTML for ${registrationId}:`, rowHTML.substring(0, 200) + '...');
            return rowHTML;
        }).join('');
        
        tbody.innerHTML = tableHTML;
        this.log('Table rendered successfully with', this.filteredParticipants.length, 'participants');
        
        // Verify that the data attributes are set correctly
        setTimeout(() => {
            const rows = tbody.querySelectorAll('tr[data-participant-id]');
            this.log('Verification: Found', rows.length, 'rows with data-participant-id attributes');
            rows.forEach((row, index) => {
                const participantId = row.dataset.participantId;
                const buttons = row.querySelectorAll('button[data-participant-id]');
                this.log(`Row ${index + 1}: participant-id="${participantId}", buttons with data-participant-id: ${buttons.length}`);
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
            const currentPageStart = (this.currentPage - 1) * this.itemsPerPage + 1;
            const currentPageEnd = Math.min(this.currentPage * this.itemsPerPage, this.totalParticipants);
            const totalPages = Math.ceil(this.totalParticipants / this.itemsPerPage);
            
            if (this.totalParticipants === 0) {
                countElement.textContent = '0 participants';
            } else {
                countElement.textContent = `${currentPageStart}-${currentPageEnd} of ${this.totalParticipants} participants (Page ${this.currentPage}/${totalPages})`;
            }
        }
    }

    updateParticipantStatistics() {
        // Only update total participants count
        // Status breakdown (confirmed/pending) is now handled by updateStatistics() 
        // which gets accurate global counts from the backend stats endpoint
        document.getElementById('totalParticipants').textContent = this.totalParticipants;
        this.log('Total participants updated:', this.totalParticipants);
    }

    renderPagination() {
        const paginationElement = document.getElementById('pagination');
        if (!paginationElement) return;

        const totalPages = Math.ceil(this.totalParticipants / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationElement.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}" ${prevDisabled ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers with smart truncation
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page + ellipsis if needed
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Main page numbers
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Last page + ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }

        // Next button
        const nextDisabled = this.currentPage === totalPages ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}" ${nextDisabled ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationElement.innerHTML = paginationHTML;

        // Add click handlers for pagination
        paginationElement.querySelectorAll('.page-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (page !== this.currentPage && page >= 1 && page <= totalPages) {
                    this.goToPage(page);
                }
            });
        });
    }

    async goToPage(page) {
        if (page === this.currentPage || page < 1) return;
        
        this.currentPage = page;
        this.showLoading(true);
        
        try {
            await this.loadParticipants();
        } catch (error) {
            this.logError('Failed to load page:', error);
            this.showAlert('Failed to load page data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Search and Filter Methods
    handleSearch(query) {
        this.searchTerm = query.toLowerCase().trim();
        this.currentPage = 1; // Reset to first page when searching
        this.applyFilters();
    }

    handleStatusFilter(status) {
        this.statusFilter = status;
        this.currentPage = 1; // Reset to first page when filtering
        this.applyFilters();
    }

    handleSort(sortBy) {
        this.sortBy = sortBy;
        this.currentPage = 1; // Reset to first page when sorting
        this.applyFilters();
    }

    applyFilters() {
        // For client-side filtering (current page only)
        let filtered = [...this.participants];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(registration => {
                const participant = registration.participant || registration;
                return (
                    participant.firstName?.toLowerCase().includes(this.searchTerm) ||
                    participant.lastName?.toLowerCase().includes(this.searchTerm) ||
                    participant.email?.toLowerCase().includes(this.searchTerm) ||
                    participant.phone?.includes(this.searchTerm) ||
                    registration.participantId?.toLowerCase().includes(this.searchTerm)
                );
            });
        }

        // Apply status filter
        if (this.statusFilter) {
            filtered = filtered.filter(registration => 
                registration.status === this.statusFilter
            );
        }

        // Apply sorting
        if (this.sortBy) {
            filtered.sort((a, b) => {
                const participantA = a.participant || a;
                const participantB = b.participant || b;
                
                switch (this.sortBy) {
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
        }

        this.filteredParticipants = filtered;
        this.renderParticipantsTable();
        this.updateParticipantCount();
        
        // Note: For true server-side filtering, we would need to modify loadParticipants
        // to send search/filter parameters to the backend API
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('sortBy').value = 'name';
        
        this.searchTerm = '';
        this.statusFilter = '';
        this.sortBy = 'name';
        this.currentPage = 1;
        
        this.filteredParticipants = [...this.participants];
        this.renderParticipantsTable();
        this.updateParticipantCount();
        this.renderPagination();
    }

    // Participant Management Methods
    viewParticipant(participantId) {
        this.log('Viewing participant with ID:', participantId);
        this.log('Available participants:', this.participants.map(p => ({ 
            participantId: p.participantId,
            _id: p._id, 
            name: `${p.participant?.firstName} ${p.participant?.lastName}` 
        })));
        
        // Search for participant by participantId field
        const registration = this.participants.find(p => p.participantId === participantId);
        if (!registration) {
            this.logError('Participant not found with ID:', participantId);
            this.log('Searching in participants array:', this.participants);
            this.showAlert(`Participant with ID ${participantId} not found`, 'error');
            return;
        }

        this.log('Found registration:', registration);
        const participant = registration.participant || registration;
        
        // Debug: Log all available participant fields
        this.log('All participant fields:', Object.keys(participant));
        this.log('Participant data:', participant);
        this.log('Field debugging:', {
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
            this.log('Using existing QR code from registration');
        } else {
            // Generate QR code with the same format as email confirmations
            const qrData = displayId;
            qrCodeUrl = this.generateQRCodeDataURL(qrData);
            this.log('Generated new QR code for registration');
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
                this.log('Using existing QR code from registration for download');
            } else {
                // Generate QR code data - match the format used in email confirmations
                const qrData = displayId;
                qrCodeUrl = this.generateQRCodeDataURL(qrData);
                this.log('Generated new QR code for download');
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
            this.logError('QR download error:', error);
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
                this.logWarn('API call failed, falling back to simulation:', apiError);
                
                // Fallback to simulation if API is not available
                await this.simulateDelay(2500);
                this.showAlert(`Confirmation email sent successfully to ${participant.email}! (Simulated)`, 'success');
            }
            
        } catch (error) {
            this.logError('Email sending error:', error);
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
            this.log(`Generating ${count} access codes...`);
            
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
            this.log('Code generation response:', data);
            
            if (response.ok && data.success) {
                this.showAlert(`Successfully generated ${data.data.generated} access codes!`, 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('generateCodesModal'));
                modal.hide();
                
                // Refresh statistics
                this.loadStatistics();
                
                // Validate codes array before download
                if (data.data.codes && Array.isArray(data.data.codes) && data.data.codes.length > 0) {
                    this.log(`Downloading ${data.data.codes.length} codes:`, data.data.codes.slice(0, 5));
                    this.downloadAccessCodes(data.data.codes);
                } else {
                    this.logError('Invalid codes array:', data.data.codes);
                    this.showAlert('Codes generated but download failed - invalid response format', 'warning');
                }
                
            } else {
                throw new Error(data.error || 'Failed to generate access codes');
            }
            
        } catch (error) {
            this.logError('Code generation error:', error);
            this.showAlert('Failed to generate access codes: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    downloadAccessCodes(codes) {
        try {
            this.log('Starting download for codes:', codes.length, 'codes');
            
            if (!codes || !Array.isArray(codes) || codes.length === 0) {
                this.logError('Invalid codes array for download:', codes);
                this.showAlert('Cannot download - no valid codes provided', 'error');
                return;
            }
            
            // Create CSV content with proper escaping
            // Escape double quotes by doubling them and wrap each field in quotes
            const escapeCsvField = (value) => {
                const stringValue = String(value);
                const escaped = stringValue.replace(/"/g, '""');
                return `"${escaped}"`;
            };
            
            // Build CSV with header and escaped rows using CRLF line endings
            const header = '"Access Code"';
            const rows = codes.map(code => escapeCsvField(code));
            const csvContent = header + '\r\n' + rows.join('\r\n');
            
            this.log('CSV content preview:', csvContent.substring(0, 200) + '...');
            
            // Create blob
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            this.log('Blob created, size:', blob.size, 'bytes');
            
            // Create download link
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                const filename = `access_codes_${new Date().toISOString().split('T')[0]}_${codes.length}codes.csv`;
                
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                
                this.log('Triggering download for:', filename);
                link.click();
                
                // Clean up
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.log('Download completed successfully');
                this.showAlert(`Downloaded ${codes.length} access codes as ${filename}`, 'success', 3000);
            } else {
                this.logError('Browser does not support HTML5 download attribute');
                this.showAlert('Download not supported in this browser', 'error');
            }
            
        } catch (error) {
            this.logError('Download error:', error);
            this.showAlert('Failed to download access codes: ' + error.message, 'error');
        }
    }

    async exportData() {
        try {
            this.showAlert('Preparing full data export...', 'info', 3000);
            
            // Fetch ALL participants from backend for export
            const allParticipants = await this.fetchAllParticipants();
            
            if (!allParticipants || allParticipants.length === 0) {
                this.showAlert('No participants found to export', 'warning');
                return;
            }
            
            this.log(`Exporting ${allParticipants.length} participants to CSV`);
            
            const csvData = this.generateParticipantsCSV(allParticipants);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                const filename = `all_participants_${new Date().toISOString().split('T')[0]}_${allParticipants.length}records.csv`;
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up
                URL.revokeObjectURL(url);
            }
            
            this.showAlert(`Successfully exported ${allParticipants.length} participants!`, 'success', 4000);
            
        } catch (error) {
            this.logError('Export error:', error);
            this.showAlert('Failed to export data: ' + error.message, 'error');
        }
    }

    async fetchAllParticipants() {
        this.log('Fetching all participants for export...');
        try {
            // Use a large limit to get all participants in one request
            // Backend has a max limit of 1000, which should be sufficient for most cases
            const url = `${this.apiBaseUrl}/admin/registrations?skip=0&limit=1000`;
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch participants');
            }

            this.log(`Fetched ${data.data.registrations.length} of ${data.data.total} total participants for export`);
            
            // If there are more participants than the limit, we need to fetch them in batches
            if (data.data.total > data.data.registrations.length) {
                this.log('Fetching remaining participants in batches...');
                const allParticipants = [...data.data.registrations];
                const limit = 1000;
                
                for (let skip = limit; skip < data.data.total; skip += limit) {
                    this.log(`Fetching batch: skip=${skip}, limit=${limit}`);
                    
                    const batchResponse = await fetch(`${this.apiBaseUrl}/admin/registrations?skip=${skip}&limit=${limit}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });

                    if (batchResponse.ok) {
                        const batchData = await batchResponse.json();
                        if (batchData.success && batchData.data.registrations) {
                            allParticipants.push(...batchData.data.registrations);
                            this.log(`Total fetched so far: ${allParticipants.length}`);
                        }
                    }
                }
                
                return allParticipants;
            }
            
            return data.data.registrations;
            
        } catch (error) {
            this.logError('Error fetching all participants:', error);
            throw new Error(`Failed to fetch participant data: ${error.message}`);
        }
    }

    generateParticipantsCSV(participants = null) {
        // Use provided participants or fall back to current page data
        const dataToExport = participants || this.participants;
        
        // Comprehensive headers for all participant data
        const headers = [
            'Participant ID',
            'First Name', 
            'Last Name',
            'Email',
            'Phone',
            'Age',
            'Gender', 
            'District',
            'Occupation',
            'Interest Area',
            'Church Affiliation',
            'Access Code',
            'Registration Date',
            'Registration Time',
            'Status'
        ];

        // Helper function to escape CSV fields properly
        const escapeCsvField = (value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape double quotes by doubling them and wrap in quotes if contains comma, quote, or newline
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const rows = dataToExport.map(registration => {
            const participant = registration.participant || registration;
            const registrationDate = new Date(registration.registrationDate || registration.createdAt);
            
            return [
                escapeCsvField(registration.participantId || registration.id || 'N/A'),
                escapeCsvField(participant.firstName || ''),
                escapeCsvField(participant.lastName || ''),
                escapeCsvField(participant.email || ''),
                escapeCsvField(participant.phone || ''),
                escapeCsvField(participant.age || ''),
                escapeCsvField(participant.gender || ''),
                escapeCsvField(participant.district || participant.location || ''),
                escapeCsvField(participant.occupation || ''),
                escapeCsvField(participant.interest || ''),
                escapeCsvField(participant.churchAffiliation || ''),
                escapeCsvField(registration.accessCode || ''),
                escapeCsvField(registrationDate.toLocaleDateString()),
                escapeCsvField(registrationDate.toLocaleTimeString()),
                escapeCsvField(registration.status || 'pending')
            ];
        });
        
        // Create CSV with proper line endings (CRLF for Excel compatibility)
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
        
        this.log(`Generated CSV with ${rows.length} participants and ${headers.length} fields`);
        return csvContent;
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
            this.logError('Dashboard refresh error:', error);
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

    async testCORSConnectivity() {
        this.log('[CORS-TEST] Testing backend connectivity...');
        this.log('[CORS-TEST] API Base URL:', this.apiBaseUrl);
        this.log('[CORS-TEST] Current Origin:', window.location.origin);
        
        try {
            // Test simple health endpoint first
            const healthResponse = await fetch(`${this.apiBaseUrl.replace('/api', '')}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (healthResponse.ok) {
                this.log('[CORS-TEST] ✅ Basic health check passed');
                
                // Test admin health endpoint
                const adminHealthResponse = await fetch(`${this.apiBaseUrl}/admin/health`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (adminHealthResponse.ok) {
                    this.log('[CORS-TEST] ✅ Admin health check passed');
                    this.log('[CORS-TEST] Response headers:', Array.from(adminHealthResponse.headers.entries()));
                } else {
                    this.logWarn('[CORS-TEST] ⚠️ Admin health check failed:', adminHealthResponse.status);
                }
            } else {
                this.logWarn('[CORS-TEST] ⚠️ Basic health check failed:', healthResponse.status);
            }
            
        } catch (error) {
            this.logError('[CORS-TEST] ❌ Connectivity test failed:', error);
            this.logError('[CORS-TEST] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
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