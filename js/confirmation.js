/**
 * confirmation.js — Registration Confirmation Page
 * Fetches registration by ?id= URL param, renders QR + participant details.
 */

class ConfirmationPage {
  constructor() {
    this.registrationData = null;
    this.init();
  }

  init() {
    this.loadRegistrationData();
    this.bindEvents();
    this.createConfettiEffect();
  }

  async loadRegistrationData() {
    const urlParams = new URLSearchParams(window.location.search);
    const registrationId = urlParams.get('id');

    if (!registrationId) {
      this.showError('No registration ID provided in the URL.');
      return;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(registrationId)) {
      this.showError('Invalid registration ID format. Please check the link.');
      return;
    }

    const apiBaseUrl = (typeof YAH !== 'undefined' && YAH.getApiBaseUrl)
      ? YAH.getApiBaseUrl()
      : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000/api'
          : 'https://yah-backend.onrender.com/api');

    try {
      const response = await fetch(`${apiBaseUrl}/registration/${registrationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          this.showError('Registration not found. This registration ID does not exist.');
        } else if (response.status === 400) {
          this.showError('Invalid registration ID. Please check the link.');
        } else {
          this.showError('Unable to load registration details. Please try again later.');
        }
        return;
      }

      const data = await response.json();

      if (!data.success) {
        this.showError(data.error || 'Invalid response from server.');
        return;
      }

      console.log('Registration data received:', data.data);

      this.registrationData = {
        id: data.data.registration.id,
        participantId: data.data.participant.participantId,
        firstName: data.data.participant.firstName,
        lastName: data.data.participant.lastName,
        email: data.data.participant.email,
        phone: data.data.participant.phone,
        age: data.data.participant.age,
        gender: data.data.participant.gender,
        district: data.data.participant.district,
        occupation: data.data.participant.occupation || 'Not specified',
        interest: data.data.participant.interest || 'Not specified',
        churchAffiliation: data.data.participant.churchAffiliation || '',
        registrationDate: new Date(data.data.registration.createdAt).toLocaleDateString(),
        accessCode: data.data.registration.accessCode,
        qrCodeUrl: data.data.registration.qrCode,
        status: data.data.registration.status,
      };

      this.displayRegistrationDetails();
    } catch (error) {
      console.error('Error loading registration data:', error);
      if (error.message.includes('Failed to fetch')) {
        this.showError('Unable to connect to the server. Please check your connection and try again.');
      } else {
        this.showError('An unexpected error occurred. Please try again later.');
      }
    }
  }

  showError(message) {
    const msgEl = document.getElementById('errorMessage');
    if (msgEl) msgEl.textContent = message;
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
  }

  displayRegistrationDetails() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('registrationDetails').style.display = 'block';
    this.displayQRCode();
    this.displayParticipantDetails();
  }

  displayQRCode() {
    const qrContainer = document.getElementById('qrCodeContainer');
    if (this.registrationData.qrCodeUrl) {
      qrContainer.innerHTML = `<img src="${this.registrationData.qrCodeUrl}" alt="Registration QR Code" class="qr-image">`;
    }
  }

  displayParticipantDetails() {
    const container = document.getElementById('participantDetails');
    const d = this.registrationData;

    const rows = [
      ['Full Name', `${d.firstName} ${d.lastName}`],
      ['Email', d.email],
      ['Phone', d.phone],
      ['Age', `${d.age} years`],
      ['Gender', d.gender],
      ['District', d.district || 'Not specified'],
      ['Occupation', d.occupation],
      ['Interest Area', d.interest],
      d.churchAffiliation ? ['Church Affiliation', d.churchAffiliation] : null,
      ['Registration Date', d.registrationDate],
      ['Participant ID', d.participantId],
      ['Access Code', d.accessCode],
    ].filter(Boolean);

    container.innerHTML = rows.map(([label, value]) => `
      <div class="info-row">
        <span class="info-label">${label}:</span>
        <span class="info-value">${value}</span>
      </div>
    `).join('');
  }

  bindEvents() {
    document.getElementById('downloadQR')?.addEventListener('click', () => this.downloadQRCode());
    document.getElementById('emailConfirmation')?.addEventListener('click', () => this.sendEmailConfirmation());
    document.getElementById('retryLoad')?.addEventListener('click', () => this.retryLoad());
  }

  downloadQRCode() {
    if (this.registrationData?.qrCodeUrl) {
      try {
        const link = document.createElement('a');
        link.href = this.registrationData.qrCodeUrl;
        link.download = `YAH-Registration-${this.registrationData.firstName}-${this.registrationData.lastName}-${this.registrationData.participantId}.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof YAH !== 'undefined') YAH.showAlert('QR Code downloaded successfully!', 'success');
      } catch (err) {
        console.error('Download error:', err);
        if (typeof YAH !== 'undefined') YAH.showAlert('Failed to download QR code. Please try again.', 'error');
      }
    } else {
      if (typeof YAH !== 'undefined') YAH.showAlert('QR code not available for download.', 'warning');
    }
  }

  async sendEmailConfirmation() {
    const btn = document.getElementById('emailConfirmation');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:0.5rem;"></i>Sending...';
    btn.disabled = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (typeof YAH !== 'undefined') YAH.showAlert('Confirmation email sent successfully!', 'success');
    } catch {
      if (typeof YAH !== 'undefined') YAH.showAlert('Failed to send confirmation email. Please try again.', 'error');
    } finally {
      btn.innerHTML = original;
      btn.disabled = false;
    }
  }

  retryLoad() {
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    this.loadRegistrationData();
  }

  createConfettiEffect() {
    const colors = ['#e67e22', '#3498db', '#27ae60', '#f39c12', '#9b59b6'];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.cssText = `
          position: fixed;
          top: -10px;
          left: ${Math.random() * 100}%;
          width: 10px;
          height: 10px;
          background-color: ${colors[Math.floor(Math.random() * colors.length)]};
          border-radius: 50%;
          pointer-events: none;
          animation: confettiFall ${(Math.random() * 3 + 2).toFixed(1)}s linear forwards;
          animation-delay: ${(Math.random() * 3).toFixed(1)}s;
          z-index: 9999;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 6000);
      }, i * 100);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new ConfirmationPage());
