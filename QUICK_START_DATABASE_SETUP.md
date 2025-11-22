# Quick Start: Database Setup & User Account Creation

This guide will help you quickly set up your database schema and create your first user account.

## Prerequisites

✅ PostgreSQL database accessible
✅ Node.js installed
✅ Project dependencies installed (`npm install`)

## 5-Minute Setup

### Step 1: Set Your Database URL

**Unix/Mac/Linux:**
```bash
export DATABASE_URL="postgresql://username:password@host:5432/database"
```

**Windows PowerShell:**
```powershell
$env:DATABASE_URL = "postgresql://username:password@host:5432/database"
```

### Step 2: Run the Setup Script

```bash
node fix-user-schema-complete.mjs \
  --email "your@email.com" \
  --password "YourSecurePassword123!" \
  --display-name "Your Name"
```

### Step 3: Start the Application

```bash
npm run dev
```

### Step 4: Login and Complete Onboarding

1. Visit http://localhost:5173
2. Login with your credentials
3. Complete the onboarding wizard
4. Start using the application!

## What This Script Does

✅ Checks database connectivity
✅ Adds missing schema columns (onboardingComplete, status, theme)
✅ Regenerates Prisma clients
✅ Creates your user account with secure password hashing
✅ Verifies everything is working

## Need More Details?

- **Full Documentation**: See [FIX_USER_SCHEMA_GUIDE.md](./FIX_USER_SCHEMA_GUIDE.md)
- **Technical Details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Troubleshooting

### "DATABASE_URL environment variable not set"
Make sure you exported the DATABASE_URL before running the script.

### "Database connection failed"
- Check your database credentials
- Ensure the database server is running
- Verify your IP is whitelisted

### Script runs but login fails
- Clear browser cookies
- Check that you're using the correct email/password
- Verify the database was updated successfully

## Example: Real-World Setup

```bash
# 1. Set database URL (example for AWS RDS)
export DATABASE_URL="postgresql://myuser:mypass@my-db.region.rds.amazonaws.com:5432/valine?sslmode=require"

# 2. Run setup script
node fix-user-schema-complete.mjs \
  --email "admin@mycompany.com" \
  --password "SecurePass123!" \
  --display-name "Admin User"

# 3. Start app
npm run dev

# Output:
# ✅ Database schema is fixed
# ✅ Prisma Clients regenerated
# ✅ User account created/updated
# ✅ All verifications passed
```

## Security Best Practices

🔒 **Never commit your DATABASE_URL to version control**
🔒 **Use strong passwords** (mix of uppercase, lowercase, numbers, special chars)
🔒 **Store credentials in environment variables** or secret management tools
🔒 **Enable SSL/TLS** for production databases (`?sslmode=require`)

## Support

Having issues? Check the full guide: [FIX_USER_SCHEMA_GUIDE.md](./FIX_USER_SCHEMA_GUIDE.md)

---

**Ready to get started?** Run the script now! 🚀
