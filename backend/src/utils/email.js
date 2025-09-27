const nodemailer = require('nodemailer');
const path = require('path');
const { config } = require('./config');

/**
 * Email service for sending QR codes and notifications
 * Constitutional requirement: TLS encryption for email services
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter with configuration
   */
  async initialize() {
    try {
      // Check if email credentials are configured
      if (!config.email.user || !config.email.password) {
        const error = new Error('Email credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
        error.code = 'EMAIL_NOT_CONFIGURED';
        throw error;
      }

      console.log('Initializing email service with:', {
        host: config.email.host,
        port: config.email.port,
        user: config.email.user,
        secure: config.email.secure,
        verify: config.email.verify
      });

      // Create transporter with TLS encryption (constitutional requirement)
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        tls: {
          // Constitutional requirement: TLS encryption
          rejectUnauthorized: config.email.tls.rejectUnauthorized !== false,
          minVersion: 'TLSv1.2',
        },
        // Add debugging for 2FA issues
        debug: config.server.nodeEnv === 'development',
        logger: config.server.nodeEnv === 'development',
      });

      // Verify connection configuration (can be disabled for 2FA accounts)
      if (config.email.verify) {
        console.log('Verifying email connection...');
        try {
          await this.transporter.verify();
          console.log('✅ Email service verified successfully');
        } catch (verifyError) {
          if (verifyError.responseCode === 535) {
            console.error('❌ Email authentication failed (535). This usually means:');
            console.error('  1. The password is incorrect');
            console.error('  2. Two-factor authentication is enabled - you need an app-specific password');
            console.error('  3. The account is locked or has security restrictions');
            console.error('');
            console.error('For Zoho with 2FA enabled:');
            console.error('  1. Login to Zoho Mail');
            console.error('  2. Go to Settings > Security');
            console.error('  3. Generate an App-Specific Password for "YAH Registration System"');
            console.error('  4. Update SMTP_PASS in .env with the app-specific password');
            console.error('');
            console.error('Alternatively, set EMAIL_VERIFY=false in .env to skip verification');
          }
          throw verifyError;
        }
      } else {
        console.log('⚠️  Email verification disabled - emails will be attempted without verification');
      }

      this.initialized = true;
      return this.transporter;
    } catch (error) {
      console.error('Failed to initialize email service:', {
        message: error.message,
        code: error.code,
        host: config.email.host,
        port: config.email.port,
        user: config.email.user ? `${config.email.user.substring(0, 3)}***` : 'NOT SET'
      });
      throw new Error(`Email service initialization failed: ${error.message}`);
    }
  }

  /**
   * Send QR code email to participant
   * @param {Object} participant - Participant data
   * @param {Object} registration - Registration data with QR code
   * @returns {Promise<Object>} Email send result
   */
  async sendQRCode(participant, registration) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const emailHtml = this.generateQREmailHTML(participant, registration);
      const emailText = this.generateQREmailText(participant, registration);

      const mailOptions = {
        from: {
          name: 'Young Access Hub',
          address: config.email.from,
        },
        to: {
          name: `${participant.firstName} ${participant.lastName}`,
          address: participant.email,
        },
        subject: 'Your Summit Registration Confirmation - Young Access Hub',
        text: emailText,
        html: emailHtml,
        attachments: [
          {
            filename: `registration-${registration._id || registration.id}.png`,
            content: registration.qrCode.split(',')[1], // Remove data:image/png;base64, prefix
            encoding: 'base64',
            cid: 'qrcode', // Content-ID for inline embedding
          },
        ],
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('QR code email sent successfully:', {
        messageId: result.messageId,
        recipient: participant.email,
        registrationId: registration._id || registration.id,
      });

      return {
        success: true,
        messageId: result.messageId,
        recipient: participant.email,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to send QR code email:', error);
      throw new Error(`QR code email failed: ${error.message}`);
    }
  }

  /**
   * Send admin notification email
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} Email send result
   */
  async sendAdminNotification(data) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const emailHtml = this.generateAdminNotificationHTML(data);
      const emailText = this.generateAdminNotificationText(data);

      const mailOptions = {
        from: {
          name: 'YAH Registration System',
          address: config.email.from,
        },
        to: config.email.adminEmail,
        subject: `New Registration Alert - ${data.eventName || 'YAH Event'}`,
        text: emailText,
        html: emailHtml,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('Admin notification sent successfully:', {
        messageId: result.messageId,
        eventData: data.eventName,
      });

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to send admin notification:', error);
      throw new Error(`Admin notification failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML email template for QR code
   * @param {Object} participant - Participant data
   * @param {Object} registration - Registration data
   * @returns {string} HTML email content
   */
  generateQREmailHTML(participant, registration) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .qr-section { text-align: center; margin: 30px 0; padding: 20px; background-color: white; border-radius: 8px; }
        .qr-code { max-width: 200px; height: auto; border: 2px solid #ddd; border-radius: 8px; }
        .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .highlight { color: #2c5aa0; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Registration Confirmed!</h1>
        <p>Young Access Hub</p>
    </div>
    
    <div class="content">
        <p>Dear <strong>${participant.firstName} ${participant.lastName}</strong>,</p>
        
        <p>Congratulations! Your registration has been successfully confirmed. We're excited to have you join us at our summit event.</p>
        
        <div class="qr-section">
            <h3>Your Digital Ticket</h3>
            <img src="cid:qrcode" alt="QR Code" class="qr-code" />
            <p><strong>Registration ID:</strong> <span class="highlight">${registration._id || registration.id}</span></p>
            <p>Please present this QR code at the event entrance</p>
        </div>
        
        <div class="details">
            <h3>Registration Details</h3>
            <p><strong>Name:</strong> ${participant.firstName} ${participant.lastName}</p>
            <p><strong>Email:</strong> ${participant.email}</p>
            <p><strong>Phone:</strong> ${participant.phone}</p>
            <p><strong>Age:</strong> ${participant.age}</p>
            <p><strong>District:</strong> ${participant.district}</p>
            <p><strong>Occupation:</strong> ${participant.occupation}</p>
            <p><strong>Interest Area:</strong> ${participant.interest}</p>
            ${participant.churchAffiliation ? `<p><strong>Church:</strong> ${participant.churchAffiliation}</p>` : ''}
            <p><strong>Registration Date:</strong> ${new Date(registration.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
        </div>
        
        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4>Important Reminders:</h4>
            <ul>
                <li>Save this email and QR code for event entry</li>
                <li>Arrive 30 minutes before the event starts</li>
                <li>For event updates, follow our social media channels</li>
            </ul>
        </div>
        
        <p>If you have any questions or need assistance, please contact us at <a href="mailto:${config.email.supportEmail}">${config.email.supportEmail}</a></p>
        
        <p>We look forward to seeing you at the summit!</p>
        
        <p>Best regards,<br>
        <strong>Young Access Hub Team</strong></p>
    </div>
    
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Young Access Hub. All rights reserved.</p>
        <p>Building Sierra Leone's Future, One Youth at a Time 🇸🇱</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text email for QR code
   * @param {Object} participant - Participant data
   * @param {Object} registration - Registration data
   * @returns {string} Plain text email content
   */
  generateQREmailText(participant, registration) {
    return `
REGISTRATION CONFIRMED - Youth Advocacy Hub Sierra Leone

Dear ${participant.firstName} ${participant.lastName},

Congratulations! Your registration has been successfully confirmed. We're excited to have you join us at our upcoming event.

REGISTRATION DETAILS:
- Name: ${participant.firstName} ${participant.lastName}
- Email: ${participant.email}
- Phone: ${participant.phone}
- Age: ${participant.age}
- District: ${participant.district}
- Occupation: ${participant.occupation}
- Interest Area: ${participant.interest}
${participant.churchAffiliation ? `- Church: ${participant.churchAffiliation}` : ''}
- Registration ID: ${registration._id || registration.id}
- Registration Date: ${new Date(registration.createdAt).toLocaleDateString()}

Your digital ticket (QR code) is attached to this email. Please present it at the event entrance.

IMPORTANT REMINDERS:
- Save this email and QR code for event entry
- Arrive 30 minutes before the event starts  
- Bring a valid ID for verification
- For event updates, follow our social media channels

If you have any questions, contact us at ${config.email.supportEmail}

We look forward to seeing you at the event!

Best regards,
Youth Advocacy Hub Sierra Leone Team

---
Building Sierra Leone's Future, One Youth at a Time 🇸🇱
© ${new Date().getFullYear()} Youth Advocacy Hub Sierra Leone. All rights reserved.
`;
  }

  /**
   * Generate HTML admin notification email
   * @param {Object} data - Notification data
   * @returns {string} HTML email content
   */
  generateAdminNotificationHTML(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Registration Alert</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #d4951a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔔 New Registration Alert</h1>
        <p>YAH Registration System</p>
    </div>
    
    <div class="content">
        <div class="alert">
            <h3>New participant registered for: ${data.eventName || 'YAH Event'}</h3>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="details">
            <h3>Participant Information</h3>
            <p><strong>Name:</strong> ${data.participant.firstName} ${data.participant.lastName}</p>
            <p><strong>Email:</strong> ${data.participant.email}</p>
            <p><strong>Phone:</strong> ${data.participant.phone}</p>
            <p><strong>Age:</strong> ${data.participant.age}</p>
            <p><strong>Gender:</strong> ${data.participant.gender}</p>
            <p><strong>District:</strong> ${data.participant.district}</p>
            <p><strong>Occupation:</strong> ${data.participant.occupation}</p>
            <p><strong>Interest Area:</strong> ${data.participant.interest}</p>
            ${data.participant.churchAffiliation ? `<p><strong>Church:</strong> ${data.participant.churchAffiliation}</p>` : ''}
            <p><strong>Registration ID:</strong> ${data.registration._id || data.registration.id}</p>
        </div>
        
        <p>Total registrations: <strong>${data.totalRegistrations || 'N/A'}</strong></p>
        
        <p>Access the admin dashboard to view more details and manage registrations.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text admin notification
   * @param {Object} data - Notification data  
   * @returns {string} Plain text content
   */
  generateAdminNotificationText(data) {
    return `
NEW REGISTRATION ALERT - YAH System

Event: ${data.eventName || 'YAH Event'}
Time: ${new Date().toLocaleString()}

PARTICIPANT INFORMATION:
- Name: ${data.participant.firstName} ${data.participant.lastName}
- Email: ${data.participant.email}
- Phone: ${data.participant.phone}
- Age: ${data.participant.age}
- Gender: ${data.participant.gender}  
- District: ${data.participant.district}
- Occupation: ${data.participant.occupation}
- Interest Area: ${data.participant.interest}
${data.participant.churchAffiliation ? `- Church: ${data.participant.churchAffiliation}` : ''}
- Registration ID: ${data.registration._id || data.registration.id}

Total registrations: ${data.totalRegistrations || 'N/A'}

Access the admin dashboard to view more details.

---
YAH Registration System
`;
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Configuration test result
   */
  async testConfiguration() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const testResult = await this.transporter.verify();
      console.log('Email configuration test passed');
      return testResult;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = {
  EmailService,
  emailService,
};