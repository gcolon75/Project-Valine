# Justin's Kanban - Business & Product Tasks

**Last Updated:** 2026-02-18
**Owner:** Justin Valine (Business/Product Owner)
**Focus:** Business operations, marketing, product decisions, and growth strategy

---

## Quick Reference

### Company Information
- **Business Name:** Joint Platform (Project Valine)
- **Status:** Beta-50 (50 allowlisted users)
- **Target Launch:** Q1 2026
- **Platform URL:** https://dkmxy676d3vgc.cloudfront.net

### Key Contacts
- **Technical Lead:** Gabriel Colon
- **Lead Engineer:** Brendan
- **Product Owner:** Justin Valine

---

## Task Summary

| Category | Total | Completed | In Progress | Not Started | Blocked |
|----------|-------|-----------|-------------|-------------|---------|
| Legal | 3 | 2 | 0 | 1 | 0 |
| Finance | 2 | 0 | 0 | 2 | 0 |
| Marketing | 5 | 0 | 0 | 5 | 0 |
| Product | 3 | 0 | 1 | 1 | 1 |
| Analytics | 2 | 0 | 0 | 2 | 0 |
| **Total** | **15** | **2** | **1** | **11** | **1** |

---

## ✅ Completed Tasks (2)

### ✅ LEGAL-001: Contract agreement
**Status:** ✅ COMPLETED
**Category:** Legal
**Priority:** P0

**What was done:**
- Partnership/founder agreement finalized
- Terms and responsibilities documented
- Signatures obtained

**Next steps:** None - complete

**Reference:** Legal documentation (private)

---

### ✅ LEGAL-002: Business registration
**Status:** ✅ COMPLETED
**Category:** Legal
**Priority:** P0

**What was done:**
- Business entity registered with state
- EIN obtained
- Corporate structure established

**Next steps:** Maintain annual compliance

**Reference:** Business registration documents (private)

---

## 🚧 In Progress (1)

### 🚧 PRODUCT-001: DM scope decision
**Status:** 🚧 IN PROGRESS
**Category:** Product Decision
**Priority:** P1
**Estimate:** Product discussion (2-4h)
**Blocking:** P1-011 (Engineering - DM implementation)

**What:** Decide DM functionality scope: share-post-only vs. full freeform chat

**Options:**

**Option A: Share-Post-Only DMs**
- ✅ Pros:
  - Keeps platform focused on content sharing
  - Simpler moderation (less abuse risk)
  - Reduces spam/harassment surface area
  - Faster to implement and test
- ❌ Cons:
  - Less engagement (users may leave for other platforms to chat)
  - Limited network effects
  - May feel restrictive to power users

**Option B: Full Freeform Chat**
- ✅ Pros:
  - Higher engagement and retention
  - Stronger network effects (users stay in-platform)
  - Competitive with Instagram/TikTok DMs
  - Unlocks future features (group chats, voice notes)
- ❌ Cons:
  - Requires moderation tooling
  - Risk of abuse/harassment
  - More complex to build (real-time delivery, read receipts)
  - Higher infrastructure costs

**Decision Framework:**
1. What's our beta-50 goal? (Validate content sharing or test social features?)
2. What's our moderation capacity during beta?
3. What do competitors offer?
4. What do beta users expect?

**Impact Analysis:**
- **High impact on:** User engagement, moderation workload, engineering timeline
- **Dependencies:** Moderation system (P2-005), abuse reporting (P2-005)
- **Timeline:** Decision needed by end of week to unblock P1-011

**Next steps:**
- [ ] Review beta user feedback on current messaging (if any)
- [ ] Analyze competitor DM features (Instagram, Discord, TikTok)
- [ ] Hold product decision meeting with Gabriel and Brendan
- [ ] Document final decision in docs/PRODUCT_DECISIONS.md
- [ ] Update P1-011 task with chosen scope

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md §7.6, Engineering task P1-011

---

## 📋 Legal Tasks (1 remaining)

### LEGAL-003: Trademark registration
**Status:** Not Started
**Category:** Legal
**Priority:** P1
**Estimate:** 4-8 weeks (legal process)

**What:** Register "Joint" trademark for social media platform services

**Steps:**
1. [ ] Conduct trademark search (USPTO database + Google)
2. [ ] Hire trademark attorney or use LegalZoom
3. [ ] File USPTO application (Class 42: Software services)
4. [ ] Monitor application status (6-12 months process)
5. [ ] Respond to any USPTO office actions
6. [ ] Receive registration certificate

**Costs:**
- USPTO filing fee: $250-$350 per class
- Attorney fees: $500-$2,000 (if using attorney)
- Total estimate: $750-$2,500

**Timeline:** 6-12 months from filing to registration

**Risk if not done:** Someone else could register "Joint" and force rebrand

**Reference:** USPTO.gov, LegalZoom trademark services

---

## 📋 Finance Tasks (2 remaining)

### FIN-001: Business bank account
**Status:** Not Started
**Category:** Finance
**Priority:** P1
**Estimate:** 1-2 weeks
**Dependencies:** LEGAL-002 (Business registration) ✅ DONE

**What:** Open business checking account for Joint Platform

**Steps:**
1. [ ] Choose bank (Mercury, Novo, Chase Business, or local credit union)
2. [ ] Gather required documents:
   - EIN letter
   - Business registration certificate
   - Operating agreement (if LLC)
   - Photo ID
3. [ ] Complete application (online or in-person)
4. [ ] Make initial deposit ($100-$500 minimum)
5. [ ] Order business debit card
6. [ ] Set up online banking

**Recommended banks:**
- **Mercury:** Best for startups, no fees, free wire transfers
- **Novo:** Free business banking, integrates with accounting software
- **Chase Business:** Traditional bank, physical branches

**Next steps after opening:**
- Link to Stripe account (FIN-002)
- Set up QuickBooks or accounting software
- Establish expense tracking process

**Reference:** Mercury.com, Novo.co, Chase business banking

---

### FIN-002: Stripe account setup
**Status:** Not Started
**Category:** Finance
**Priority:** P1
**Estimate:** 2-4h
**Dependencies:** FIN-001 (Business bank account), Engineering P2-006

**What:** Create Stripe account for payment processing (paid post access)

**Steps:**
1. [ ] Create Stripe account at stripe.com
2. [ ] Complete business verification:
   - Business name, address, EIN
   - Bank account details (routing + account number)
   - Owner information (SSN, DOB, address)
3. [ ] Verify bank account (micro-deposits)
4. [ ] Enable test mode for development
5. [ ] Generate API keys:
   - Publishable key (frontend)
   - Secret key (backend - store in AWS Secrets Manager)
6. [ ] Configure webhooks:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
7. [ ] Set up pricing:
   - Decide post access pricing tiers
   - Configure products in Stripe dashboard
8. [ ] Test checkout flow in staging

**Product Pricing Decision Needed:**
- What price points for paid posts? ($1, $5, $10, custom?)
- Subscription vs. one-time payment?
- Revenue split model (if artists set prices)?

**Integration work:** Requires engineering task P2-006

**Reference:** stripe.com/docs, docs/REPO_AUDIT_TRUTH_DOC.md Top 10 #5

---

## 📋 Marketing Tasks (5 remaining)

### MKT-001: Instagram account setup
**Status:** Not Started
**Category:** Marketing
**Priority:** P1
**Estimate:** 2-4h

**What:** Create and launch official Joint Platform Instagram account

**Steps:**
1. [ ] Create Instagram business account @jointplatform (or @jointonline)
2. [ ] Design profile:
   - Profile photo (logo)
   - Bio (elevator pitch: "The platform for artists to share their journey")
   - Link to landing page
3. [ ] Create 10 launch posts:
   - Platform screenshots
   - Feature highlights (posts, reels, connections)
   - Founder story
   - Beta signup CTA
4. [ ] Schedule content calendar (3x/week)
5. [ ] Follow industry accounts and engage
6. [ ] Run Instagram ads for beta signups (budget: $500/month)

**Content themes:**
- Behind-the-scenes development
- Artist success stories
- Platform features and tips
- Community highlights

**Reference:** Instagram business tools, Later.com for scheduling

---

### MKT-002: Content strategy
**Status:** Not Started
**Category:** Marketing
**Priority:** P2
**Estimate:** 4-8h

**What:** Define content strategy for blog, social media, and email

**Deliverables:**
1. [ ] Content calendar (Q1 2026)
2. [ ] Blog topics (SEO-optimized):
   - "How to build your artist brand online"
   - "The future of creator platforms"
   - "10 tips for growing your creative audience"
3. [ ] Email sequences:
   - Welcome email (new signups)
   - Onboarding emails (3-part series)
   - Weekly digest (top posts, new features)
4. [ ] Social media templates (Canva)
5. [ ] Brand voice guidelines

**Reference:** Content marketing best practices, HubSpot blog strategy

---

### MKT-003: Influencer outreach
**Status:** Not Started
**Category:** Marketing
**Priority:** P2
**Estimate:** Ongoing
**Dependencies:** Beta-50 live, product stable

**What:** Partner with micro-influencers to promote Joint Platform

**Strategy:**
1. [ ] Identify target influencers:
   - Visual artists (10K-100K followers)
   - Musicians (similar range)
   - Photographers
2. [ ] Create outreach email template:
   - Personalized intro
   - Value prop (early access, featured artist)
   - CTA (try platform, share feedback)
3. [ ] Offer incentives:
   - Free premium access (when launched)
   - Revenue share on paid posts
   - Featured profile on homepage
4. [ ] Track results:
   - Signups per influencer
   - Engagement rates
   - Content quality

**Target:** 10 influencer partnerships by end of Q1 2026

**Reference:** Influencer marketing platforms (AspireIQ, Grin)

---

### MKT-004: Email marketing setup
**Status:** Not Started
**Category:** Marketing
**Priority:** P2
**Estimate:** 4-6h
**Dependencies:** Analytics (GA4) for conversion tracking

**What:** Set up email marketing platform and sequences

**Steps:**
1. [ ] Choose email platform:
   - Mailchimp (easy, free tier)
   - SendGrid (developer-friendly)
   - ConvertKit (creator-focused)
2. [ ] Design email templates (match brand)
3. [ ] Create sequences:
   - Welcome email (trigger: signup)
   - Onboarding series (days 1, 3, 7)
   - Engagement emails (weekly digest)
   - Re-engagement (inactive users)
4. [ ] Set up signup forms:
   - Landing page
   - Blog sidebar
5. [ ] Configure analytics:
   - Open rates
   - Click-through rates
   - Conversion tracking

**Reference:** Mailchimp.com, SendGrid.com, Really Good Emails for inspiration

---

### MKT-005: Press kit and media outreach
**Status:** Not Started
**Category:** Marketing
**Priority:** P2
**Estimate:** 8-12h

**What:** Create press kit and reach out to tech/creator media

**Press Kit Contents:**
1. [ ] Company overview (1-pager)
2. [ ] Founder bios and photos
3. [ ] Product screenshots (high-res)
4. [ ] Logo variations (PNG, SVG)
5. [ ] Press release (beta launch)
6. [ ] Feature list and differentiators

**Media targets:**
- TechCrunch (startup coverage)
- Product Hunt (launch day)
- Creator economy newsletters (Passion Economy, The Creator Economy)
- Reddit (r/startups, r/SideProject)

**Reference:** Press kit examples from successful startups

---

## 📋 Product Decision Tasks (2 remaining)

### PRODUCT-002: Beta-50 roles and permissions
**Status:** BLOCKED
**Category:** Product Decision
**Priority:** P1
**Blocking:** Engineering implementation

**What:** Define roles for beta-50 users: Artists vs. Fans vs. Admin

**Current state:** All users have same permissions

**Questions to answer:**
1. Should beta-50 users all be "artists" (content creators)?
2. Or mix of artists + fans (content consumers)?
3. What features are artist-only vs. available to all?
4. Do we need role selection during onboarding?

**Proposed roles:**

**Artist:**
- Can create posts and reels
- Can set post visibility (public, followers, paid)
- Can view analytics
- Can receive paid access requests

**Fan:**
- Can follow artists
- Can like, comment, save posts
- Can request access to paid posts
- Cannot create posts (or limited posts)

**Admin:**
- All artist permissions
- Can moderate content
- Can ban users
- Can view system analytics

**Decision needed:**
- Do we implement roles for beta-50?
- Or wait until post-beta when we have more users?

**Impact:** If roles are needed, requires database migration and auth middleware changes

**Blocker:** Needs product decision before engineering can scope work

**Reference:** docs/REPO_AUDIT_TRUTH_DOC.md, user feedback from alpha testing

---

### PRODUCT-003: Pricing strategy for paid posts
**Status:** Not Started
**Category:** Product Decision
**Priority:** P2
**Estimate:** 4-8h (research + decision)
**Dependencies:** FIN-002 (Stripe setup), P2-006 (Engineering - Stripe integration)

**What:** Define pricing model for paid post access

**Options:**

**Option A: Fixed Pricing Tiers**
- Artists choose from preset tiers: $1, $5, $10, $25
- ✅ Pros: Simple, predictable, easy to display
- ❌ Cons: Less flexibility, may not fit all content types

**Option B: Custom Pricing**
- Artists set any price ($1-$100)
- ✅ Pros: Maximum flexibility, artists control value
- ❌ Cons: Decision fatigue, inconsistent pricing across platform

**Option C: Subscription Model**
- Users subscribe to artists ($5/month for all content)
- ✅ Pros: Recurring revenue, predictable income for artists
- ❌ Cons: Higher commitment, may reduce casual purchases

**Option D: Hybrid**
- Both one-time purchases and subscriptions
- ✅ Pros: Best of both worlds
- ❌ Cons: Most complex to build and explain

**Revenue split:**
- Industry standard: 70% artist / 30% platform
- Or: 80% artist / 20% platform (more artist-friendly)
- Stripe fees: ~2.9% + $0.30 per transaction (absorbed by platform or artist?)

**Questions to answer:**
1. What's our revenue goal for year 1?
2. What pricing do competitors use? (Patreon, OnlyFans, Ko-fi)
3. What do artists expect to charge?
4. What are fans willing to pay?

**Next steps:**
- [ ] Survey beta-50 artists on preferred pricing
- [ ] Research competitor pricing models
- [ ] Calculate revenue projections for each option
- [ ] Make decision and document in docs/PRODUCT_DECISIONS.md

**Reference:** Patreon pricing, OnlyFans model, Stripe documentation

---

## 📋 Analytics Tasks (2 remaining)

### ANALYTICS-001: Google Analytics 4 setup
**Status:** Not Started
**Category:** Analytics
**Priority:** P1
**Estimate:** 2-4h

**What:** Set up GA4 for user tracking and conversion funnels

**Steps:**
1. [ ] Create GA4 property at analytics.google.com
2. [ ] Install GA4 tracking code in frontend:
   - Add gtag.js to index.html
   - Configure in src/analytics/client.js
3. [ ] Set up custom events:
   - signup_complete
   - onboarding_complete
   - post_created
   - post_liked
   - connection_request_sent
   - paid_post_purchased
4. [ ] Configure conversion goals:
   - Signup → Onboarding → First post
   - View post → Like → Follow artist
5. [ ] Create dashboards:
   - User acquisition
   - Engagement metrics
   - Conversion funnels
6. [ ] Set up audiences for retargeting

**Reference:** GA4 documentation, existing src/analytics/client.js file

---

### ANALYTICS-002: Meta Pixel setup
**Status:** Not Started
**Category:** Analytics
**Priority:** P2
**Estimate:** 1-2h
**Dependencies:** MKT-001 (Instagram account)

**What:** Install Meta Pixel for Facebook/Instagram ad tracking

**Steps:**
1. [ ] Create Meta Pixel in Facebook Events Manager
2. [ ] Install Pixel code in frontend (src/analytics/client.js)
3. [ ] Configure standard events:
   - ViewContent (post views)
   - CompleteRegistration (signup)
   - Lead (email capture)
   - Purchase (paid post access)
4. [ ] Test Pixel with Facebook Pixel Helper extension
5. [ ] Create custom audiences:
   - Website visitors
   - Signups who didn't complete onboarding
   - Active users (last 30 days)
6. [ ] Set up conversion tracking for ad campaigns

**Why needed:** Track ROI on Instagram/Facebook ads, build retargeting audiences

**Reference:** Meta Pixel documentation, Facebook Business Manager

---

## Decision Frameworks

### Product Decision Template

When making product decisions, use this framework:

1. **Problem Statement:** What problem are we solving?
2. **Options:** List 2-4 options with pros/cons
3. **User Impact:** How does this affect beta-50 users?
4. **Engineering Impact:** How much work? What's the timeline?
5. **Business Impact:** Revenue, growth, competitive advantage?
6. **Decision:** Which option? Why?
7. **Success Metrics:** How will we measure if this was the right call?

### Priority Matrix

**P0 Critical:** Blocks beta-50 launch, must be done first
**P1 High:** Important for beta success, do soon
**P2 Medium:** Nice to have, can wait until post-beta

---

## Impact Analysis - Business Decisions

### High Impact Decisions (Require stakeholder discussion)
- DM scope (share-only vs. freeform chat)
- Pricing strategy for paid posts
- Beta-50 user mix (all artists vs. artists + fans)
- Revenue split model (70/30 vs. 80/20)

### Medium Impact Decisions (Can decide async)
- Email marketing platform choice
- Instagram content calendar themes
- Influencer partnership incentives

### Low Impact Decisions (Just decide and execute)
- Press kit design
- Email template colors
- Social media posting schedule

---

## Key Metrics to Track

### User Acquisition
- Signups per week
- Signup source (organic, Instagram, referral)
- Cost per acquisition (CPA) from ads

### User Engagement
- Daily active users (DAU)
- Weekly active users (WAU)
- Posts created per user
- Comments per post
- Time on platform

### Conversion Funnels
- Signup → Onboarding completion (target: 80%)
- Onboarding → First post (target: 60%)
- Post view → Like (target: 15%)
- Post view → Follow (target: 5%)

### Revenue (when live)
- Paid post purchases per week
- Average transaction value
- Revenue per artist
- Revenue per fan

---

## Support & Questions

**Documentation:**
- docs/REPO_AUDIT_TRUTH_DOC.md - Technical audit
- docs/USER_FLOWS.md - User flow documentation
- docs/PRODUCT_DECISIONS.md - Product decision log (create this)

**Stakeholders:**
- **Technical:** Gabriel Colon (Infrastructure, deployment)
- **Engineering:** Brendan (Feature development)
- **Business:** Justin Valine (Product, marketing, finance)

---

## Next Actions (This Week)

1. ✅ **CRITICAL:** Make DM scope decision (PRODUCT-001) - blocks engineering
2. ⏳ **HIGH:** Open business bank account (FIN-001) - blocks Stripe
3. ⏳ **HIGH:** Set up GA4 (ANALYTICS-001) - needed for beta tracking
4. ⏳ **HIGH:** Create Instagram account (MKT-001) - start building audience
5. ⏳ **MEDIUM:** File trademark application (LEGAL-003) - long process, start now

---

**End of Justin's Kanban**
