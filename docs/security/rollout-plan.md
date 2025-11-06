# Security Features Rollout Plan

## Overview

This document provides a phased approach to deploying the new account security and privacy features for Project Valine. The plan ensures minimal disruption while maximizing security improvements.

## Pre-Deployment Checklist

### Infrastructure

- [ ] Database backup completed
- [ ] Staging environment ready
- [ ] Production environment variables configured
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested

### Security Configuration

- [ ] Generate strong `JWT_SECRET` (32+ characters)
- [ ] Generate strong `TOTP_ENCRYPTION_KEY` (32+ characters)
- [ ] Configure SMTP credentials
- [ ] Set production `BASE_URL`
- [ ] Review CSP directives
- [ ] Configure `API_DOMAINS` for CSP

### Testing

- [ ] Run all unit tests
- [ ] Complete integration testing
- [ ] Perform manual security testing
- [ ] Load testing completed
- [ ] Penetration testing (if required)

## Phase 1: Foundation (Week 1)

**Goal**: Deploy infrastructure with all security features disabled

### Steps

1. **Deploy Code**
   ```bash
   # Deploy to staging
   git checkout main
   git pull origin main
   npm install
   npm run build
   ```

2. **Run Database Migration**
   ```bash
   cd api
   npx prisma migrate deploy
   ```

3. **Backfill Existing Users** (Optional)
   ```sql
   -- Mark all existing users as verified
   UPDATE users SET "emailVerified" = true WHERE "createdAt" < NOW();
   ```

4. **Configure Environment**
   ```bash
   # Minimal configuration
   JWT_SECRET=<strong-random-string>
   TOTP_ENCRYPTION_KEY=<strong-random-string>
   
   # Features disabled
   CSRF_ENABLED=false
   USE_SESSION_TRACKING=false
   FEATURE_2FA_ENABLED=false
   EMAIL_ENABLED=false
   ```

5. **Deploy Server**
   ```bash
   cd server
   npm start
   ```

6. **Verify Health**
   ```bash
   curl https://api.valine.app/
   curl https://api.valine.app/health
   ```

### Success Criteria

- [ ] Server starts without errors
- [ ] Existing functionality works
- [ ] No user complaints
- [ ] Error rates normal
- [ ] Response times normal

### Monitoring

- Error rate < 0.1%
- Response time < 200ms
- No database errors
- No authentication failures

### Rollback Trigger

- Error rate > 1%
- Critical functionality broken
- Database issues

## Phase 2: Email Verification (Week 2)

**Goal**: Enable email verification for new users

### Steps

1. **Configure Email Service**
   ```bash
   EMAIL_ENABLED=true
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=<api-key>
   FROM_EMAIL=noreply@valine.app
   BASE_URL=https://valine.app
   ```

2. **Test Email Sending**
   ```bash
   # Create test user and verify email received
   curl -X POST https://api.valine.app/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","username":"testuser","password":"Test123!","displayName":"Test User"}'
   ```

3. **Monitor Email Delivery**
   - Check SMTP logs
   - Monitor bounce rates
   - Verify templates render correctly

4. **Update Frontend** (Optional)
   - Add email verification prompt
   - Show verification status
   - Resend verification button

### Success Criteria

- [ ] Verification emails sent
- [ ] Emails received within 1 minute
- [ ] Templates display correctly
- [ ] Links work correctly
- [ ] Bounce rate < 5%

### Monitoring

- Email delivery rate > 95%
- Email delivery time < 1 minute
- Bounce rate < 5%
- Verification rate > 70%

### Rollback Trigger

- Email delivery fails
- High bounce rate
- User complaints about emails

## Phase 3: Rate Limiting (Week 3)

**Goal**: Protect authentication endpoints from brute-force attacks

**Note**: Rate limiting is already active by default in the code

### Steps

1. **Verify Rate Limiting**
   ```bash
   # Test rate limiting
   for i in {1..10}; do
     curl -X POST https://api.valine.app/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}'
   done
   ```

2. **Monitor Rate Limit Hits**
   - Track 429 responses
   - Identify legitimate vs malicious
   - Adjust thresholds if needed

3. **Configure Alerts**
   - Alert on high rate limit hits
   - Alert on potential attacks
   - Dashboard for monitoring

### Success Criteria

- [ ] Rate limiting active
- [ ] 429 responses returned correctly
- [ ] Legitimate users not blocked
- [ ] Attack attempts blocked

### Monitoring

- Rate limit hits per hour
- False positive rate < 1%
- Attack detection accuracy
- User complaints < 5

### Rollback Trigger

- High false positive rate
- Legitimate users blocked
- Performance degradation

## Phase 4: Security Headers (Week 4)

**Goal**: Enable comprehensive security headers

### Steps

1. **Deploy with CSP Report-Only**
   ```bash
   CSP_REPORT_ONLY=true
   CSP_REPORT_URI=https://csp-reports.valine.app
   ```

2. **Monitor CSP Reports**
   - Collect violations for 1 week
   - Identify legitimate vs blocked
   - Adjust CSP directives

3. **Update CSP Directives**
   ```javascript
   // Add necessary domains
   API_DOMAINS=https://api.valine.app,https://cdn.valine.app
   ```

4. **Enable CSP Enforcement**
   ```bash
   CSP_REPORT_ONLY=false
   ```

5. **Verify Other Headers**
   ```bash
   curl -I https://valine.app
   # Check for:
   # - Strict-Transport-Security
   # - X-Frame-Options
   # - X-Content-Type-Options
   # - Referrer-Policy
   ```

### Success Criteria

- [ ] CSP reports reviewed
- [ ] No legitimate requests blocked
- [ ] All security headers present
- [ ] No functionality broken

### Monitoring

- CSP violation reports
- Blocked resources
- User experience metrics
- Error rates

### Rollback Trigger

- CSP blocks legitimate resources
- Broken functionality
- User complaints

## Phase 5: Session Tracking (Week 5)

**Goal**: Enable database session tracking for better security

### Steps

1. **Enable Session Tracking**
   ```bash
   USE_SESSION_TRACKING=true
   ```

2. **Monitor Database Load**
   - Session table size
   - Query performance
   - Database CPU/memory

3. **Configure Cleanup Job**
   ```javascript
   // Add cron job to clean expired sessions
   // Run daily at 2 AM
   0 2 * * * node scripts/cleanup-sessions.js
   ```

4. **Update Frontend**
   - Add active sessions page
   - Show session management
   - Allow session revocation

### Success Criteria

- [ ] Sessions tracked correctly
- [ ] Database performance acceptable
- [ ] Users can manage sessions
- [ ] Cleanup job working

### Monitoring

- Session table growth rate
- Database query time
- Session revocation success rate
- User session count

### Rollback Trigger

- Database performance degradation
- High query times
- Storage issues

## Phase 6: Two-Factor Authentication (Week 6-8)

**Goal**: Roll out 2FA to users gradually

### Steps

**Week 6: Beta Testing**

1. **Enable for Beta Users**
   ```bash
   FEATURE_2FA_ENABLED=true
   ```

2. **Select Beta Users**
   - Internal team members
   - Volunteer beta testers
   - High-value accounts

3. **Collect Feedback**
   - Ease of setup
   - Issues encountered
   - Recovery code usage

**Week 7: Gradual Rollout**

1. **Enable for Power Users**
   - High-activity users
   - Users with sensitive data
   - Optional enrollment

2. **Monitor Adoption**
   - Enrollment rate
   - Support tickets
   - User feedback

**Week 8: General Availability**

1. **Enable for All Users**
   - Optional enrollment
   - Promote via email/banner
   - Provide documentation

2. **Monitor Adoption and Issues**
   - Track enrollment rate
   - Support ticket volume
   - Technical issues

### Success Criteria

- [ ] Beta testing successful
- [ ] < 10 support tickets per 1000 users
- [ ] Enrollment rate > 10%
- [ ] No critical issues

### Monitoring

- Enrollment rate
- Support ticket volume
- Recovery code usage
- Login success rate

### Rollback Trigger

- Critical security bug
- High support volume
- Major usability issues

## Phase 7: Audit Logging (Continuous)

**Goal**: Enable comprehensive audit logging

**Note**: Audit logging is already active in the code

### Steps

1. **Verify Logging**
   ```bash
   # Check audit logs
   curl -H "Authorization: Bearer <token>" \
     https://api.valine.app/api/privacy/audit-log
   ```

2. **Configure Retention**
   ```bash
   AUDIT_LOG_RETENTION_DAYS=90
   ```

3. **Set Up Cleanup Job**
   ```bash
   # Run monthly on 1st at 1 AM
   0 1 1 * * node scripts/cleanup-audit-logs.js
   ```

4. **Monitor Log Volume**
   - Logs per day
   - Storage growth
   - Query performance

### Success Criteria

- [ ] All actions logged
- [ ] Logs accessible to users
- [ ] Cleanup job working
- [ ] Storage manageable

### Monitoring

- Audit log volume
- Storage usage
- Query performance
- Cleanup job success

## Phase 8: Privacy Features (Week 9)

**Goal**: Enable data export and account deletion

**Note**: Privacy features are already deployed

### Steps

1. **Test Data Export**
   ```bash
   curl -H "Authorization: Bearer <token>" \
     https://api.valine.app/api/privacy/export
   ```

2. **Test Account Deletion**
   - Create test account
   - Request deletion
   - Verify cascading deletes
   - Verify data removal

3. **Add UI Components**
   - Data export button
   - Account deletion flow
   - Confirmation dialogs

4. **Legal Review**
   - GDPR compliance
   - Terms of service
   - Privacy policy

### Success Criteria

- [ ] Data export works
- [ ] Account deletion works
- [ ] Cascading deletes work
- [ ] Legal requirements met

### Monitoring

- Export requests per day
- Deletion requests per day
- Failed exports/deletions
- User feedback

## Post-Deployment

### Week 10-12: Stabilization

1. **Monitor All Metrics**
   - Error rates
   - Performance
   - Security incidents
   - User feedback

2. **Address Issues**
   - Fix bugs
   - Improve UX
   - Optimize performance

3. **Collect Feedback**
   - User surveys
   - Support tickets
   - Usage analytics

### Ongoing Maintenance

1. **Regular Security Reviews**
   - Quarterly security audits
   - Penetration testing
   - Dependency updates

2. **Feature Enhancements**
   - Passwordless auth
   - Hardware tokens (WebAuthn)
   - Social authentication

3. **Compliance Updates**
   - GDPR changes
   - New regulations
   - Industry standards

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

**Trigger**: Critical security issue or major functionality broken

```bash
# Disable all security features
CSRF_ENABLED=false
USE_SESSION_TRACKING=false
FEATURE_2FA_ENABLED=false
EMAIL_ENABLED=false

# Restart server
pm2 restart valine-api
```

### Partial Rollback (< 15 minutes)

**Trigger**: Single feature causing issues

```bash
# Disable specific feature
FEATURE_2FA_ENABLED=false  # Example: disable 2FA only

# Restart server
pm2 restart valine-api
```

### Database Rollback (< 1 hour)

**Trigger**: Database migration issues

```bash
# Revert migration
cd api
npx prisma migrate resolve --rolled-back 20251105225000_add_security_features

# Or manual SQL
psql -d valine_db -f rollback.sql
```

### Full Rollback (< 2 hours)

**Trigger**: Need to return to pre-security state

```bash
# Deploy previous version
git checkout <previous-commit>
npm install
npm run build

# Revert database
cd api
npx prisma migrate resolve --rolled-back 20251105225000_add_security_features

# Deploy
pm2 restart valine-api
```

## Communication Plan

### Pre-Deployment

- [ ] Notify team of upcoming changes
- [ ] Update documentation
- [ ] Prepare support resources

### During Rollout

- [ ] Status updates to team
- [ ] Monitor user feedback
- [ ] Update progress tracker

### Post-Deployment

- [ ] Announce new features
- [ ] Provide user guides
- [ ] Collect feedback

### User Communications

**Email 1: New Security Features**
- Sent 1 week before Phase 2
- Explain email verification
- Provide documentation link

**Email 2: Two-Factor Authentication**
- Sent during Phase 6
- Explain 2FA benefits
- Enrollment instructions

**Email 3: Privacy Features**
- Sent during Phase 8
- Data export available
- Privacy controls explained

## Success Metrics

### Technical Metrics

- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%
- **Response Time**: < 200ms p95
- **Security Incidents**: 0 critical
- **Failed Logins**: < 5% decrease after rate limiting

### User Metrics

- **Email Verification Rate**: > 70%
- **2FA Enrollment Rate**: > 10% (first month)
- **Support Tickets**: < 20/week
- **User Satisfaction**: > 4.5/5
- **Data Export Requests**: < 10/week

### Security Metrics

- **Brute Force Attempts Blocked**: > 95%
- **CSRF Attempts Blocked**: 100%
- **Security Incidents**: 0
- **Vulnerability Score**: Improved by > 50%

## Lessons Learned

_To be filled in after deployment_

### What Went Well

- 

### What Could Be Improved

- 

### Surprises

- 

### Action Items

- 

---

**Version**: 1.0  
**Last Updated**: November 5, 2024  
**Owner**: Backend Team  
**Status**: Ready for Execution
