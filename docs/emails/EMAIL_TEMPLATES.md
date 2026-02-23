# Joint Networking — Email Templates Reference

All transactional emails are sent from **support@joint-networking** (display name: *Joint Networking*).

> **Note:** `support@joint-networking` is a placeholder sender address used until the production domain is confirmed. Replace with the full domain address (e.g., `support@joint-networking.com`) before launch.

---

## 1. Email Verification (Account Creation)

**Subject:** Verify your email address — Joint Networking  
**Trigger:** User registers; system sends a tokenised verification link.

> **Current implementation:** The backend sends a one-click verification link
> (`/verify-email?token=…`) using `POST /auth/verify-email { token }`.
> The plain-text copy below reflects this token-link flow.
>
> **Planned (future):** A one-time code (OTP) flow is scaffolded on the frontend
> (`requestEmailVerification` / `verifyEmailCode` in `authService.js`) and will
> replace or supplement this flow once the backend endpoints
> `/auth/request-email-code` and `/auth/verify-email-code` are implemented.

**Plain text (token-link flow):**
```
Hi [name],

Welcome to Joint Networking! Please verify your email address by clicking the
link below:

[VERIFICATION_LINK]

This link expires in 24 hours. If you didn't create an account, you can safely
ignore this email.

— The Joint Networking Team
support@joint-networking
```

**HTML summary:** Centered card with green header, large CTA button linking to
`[VERIFICATION_LINK]`, 24-hour expiry notice.

---

## 2. Welcome / Account Created

**Subject:** Welcome to Joint Networking, [name]!  
**Trigger:** Email successfully verified; account activated.

**Plain text:**
```
Hi [name],

Your account is ready. Start connecting with other entertainment professionals today.

Visit your profile: [PROFILE_URL]

— The Joint Networking Team
support@joint-networking
```

---

## 3. Password Reset

**Subject:** Reset your Joint Networking password  
**Trigger:** User clicks "Forgot password."

**Plain text:**
```
Hi [name],

We received a request to reset your password. Click the link below (expires in 1 hour):

[RESET_LINK]

If you didn't request this, please ignore this email.

— The Joint Networking Team
support@joint-networking
```

---

## 4. Email Address Change

**Subject:** Confirm your new email address — Joint Networking  
**Trigger:** User requests an email address change in Settings.

**Plain text:**
```
Hi [name],

Please confirm your new email address by clicking:

[CONFIRM_LINK]

This link expires in 24 hours.

— The Joint Networking Team
support@joint-networking
```

---

## 5. Notification Digest

**Subject:** Your Joint Networking digest — [DATE]  
**Trigger:** Weekly or daily digest (user preference).

**Plain text:**
```
Hi [name],

Here's what happened on Joint Networking this week:

- [N] new followers
- [N] comments on your posts
- [N] new connection requests

Visit Joint Networking: [APP_URL]

— The Joint Networking Team
support@joint-networking
```

---

## 6. Support Reply

**Subject:** Re: [original subject] — Joint Networking Support  
**Trigger:** Support team replies to a user ticket.

**Plain text:**
```
Hi [name],

Thank you for reaching out. Here is our response to your inquiry:

[SUPPORT_REPLY_BODY]

If you have further questions, reply to this email.

— The Joint Networking Support Team
support@joint-networking
```

---

*Last updated: 2026-02-23*
