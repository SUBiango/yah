# Event Registration System – Project Requirements

## Goal
Build a lightweight and secure event registration system for youth in Sierra Leone.  
Participants purchase access codes offline and use them to unlock the online registration form.  
After registration, a unique QR code is generated for event entry and sent by email.  
An admin page tracks **only registered codes and participants** (unused codes are never exposed).

---

## Key Features

### 1. Participant Flow
- **Access Code Validation**
  - User goes to the website and clicks **Register**.
  - Registration form is visible but cannot be submitted until a valid access code is entered.
  - Only unused codes are accepted.

- **Registration Form**
  - Fields:
    - Full Name  
    - Phone Number  
    - Email Address  
    - Age  
    - Occupation  
    - Primary Track of Interest (dropdown: *Innovation & Entrepreneurship, Leadership Development, Networking*)  
    - Access Code  
    - Checkbox: *I agree to the Terms & Conditions and Privacy Policy* (required)  

- **Form Submission**
  - Once form is submitted with a valid code:
    - Code is marked as **used**.
    - User info is saved in the database.
    - A one-time **QR code** is generated.
    - Confirmation email is sent with:
      - Thank-you note
      - Event details
      - Attached/linked QR code

- **QR Code**
  - Unique to each participant.
  - Used for check-in at the event gate.
  - Can be re-downloaded from the admin page if lost.

---

### 2. Admin Flow
- **Security**
  - Admin page is protected by a **static passcode gate** (checked on the server; passcode stored as ENV variable).  
  - Only people who know the passcode can view the page.  
  - This avoids full authentication systems while keeping unauthorized users out.  

- **Admin Page**
  - Displays a table of **only registered participants** (unused codes are hidden).  
  - Columns:
    - Name
    - Phone
    - Email
    - Age
    - Occupation
    - Track of Interest
    - Access Code (used)
    - Status: `Registered`
    - Download QR button
  - Ability to download participant’s QR code in case they lose it.  
  - No visibility into unused codes → minimizes security risks.

---

### 3. Security
- Access codes:
  - Must be **randomly generated**, unique, and difficult to guess.
  - Example: `8-12 character alphanumeric string (e.g., X9F4-AB72-QJ3L)`
- Codes can only be used once (marked as used after registration).
- QR codes are one-time and tied to participant records.
- Admin page is passcode-gated + excludes unused codes.

---

### 4. Notifications
- **Email Notifications**
  - Sent automatically after successful registration.
  - Includes:
    - Participant’s name
    - Event details (date, venue, time)
    - QR code (as attachment or link)
  - Sent using a lightweight mail service (e.g., Nodemailer with Gmail/SMTP).

---

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JS (simple, fast, lightweight)
- **Backend:** Node.js + Express
- **Database:** MongoDB (stores codes and participant data)
- **QR Code Generation:** `qrcode` npm package
- **Email Sending:** Nodemailer + zoho SMTP setup

---

## Deliverables
1. **Participant Registration Flow**
   - Code-gated registration form
   - QR code generation and download
   - Email confirmation with QR code

2. **Admin Page**
   - Passcode-protected access
   - Real-time list of registered participants only
   - Download button for QR codes

3. **Access Code Management**
   - Securely pre-generated codes stored in DB
   - Codes marked as used upon registration

---

## Out of Scope
- Online payment integration
- Authentication system for admin
- SMS notifications
- Visibility of unused codes in admin

---

## Success Criteria
- Participants can only register with a valid, unused code.
- Registration form captures all required participant details.
- QR codes are unique, delivered by email, and scannable at the event gate.
- Admin page is simple, secure, and never exposes unused codes.
- System remains lightweight, fast, and easy to use.
