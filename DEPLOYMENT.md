# Sri Guru Nanak Public School ERP — Deployment Guide

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Supabase](https://supabase.com/) account (free tier is sufficient)
- A modern web browser

---

## 1. Supabase Setup

### Create a Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your school's location
3. Set a strong database password

### Run the Schema
1. Open the **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste and click **Run**
4. This creates all tables, indexes, seed data, and RLS policies

### Get Your API Keys
1. Go to **Settings → API** in your Supabase dashboard
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon/Public key** (starts with `eyJ...`)

---

## 2. Environment Configuration

### Create `.env` file
Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Important**: Never commit the `.env` file to version control. It's already in `.gitignore`.

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Default Admin Login
- Email: `admin@sgnps.com`
- Password: `admin123`

---

## 4. Production Build

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The build output is in the `dist/` directory.

---

## 5. Deployment Options

### Option A: Static Hosting (Recommended)
Deploy the `dist/` folder to any static hosting service:

- **Vercel**: `npx vercel` (auto-detects Vite)
- **Netlify**: Drag and drop `dist/` folder or connect your Git repo
- **GitHub Pages**: Push `dist/` to `gh-pages` branch
- **Firebase Hosting**: `firebase deploy`

### Option B: Traditional Web Server
Copy the `dist/` folder to your web server (Apache, Nginx, etc.) and configure it to serve `index.html` for all routes (SPA fallback).

**Nginx example:**
```nginx
server {
    listen 80;
    server_name erp.sgnps.com;
    root /var/www/school-erp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. Production Security

### Row Level Security (RLS)

The development schema has open RLS policies (`USING (true)`). For production:

1. **Remove** the development `"Allow all access"` policies
2. **Add** proper role-based policies. Examples:

```sql
-- Students can only view their own records
CREATE POLICY "students_own_data" ON fees
  FOR SELECT USING (student_id = auth.uid());

-- Admins have full access
CREATE POLICY "admin_full_access" ON fees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

3. See `enhanced-schema.sql` for comprehensive RLS policy examples

### Password Security
The current system stores passwords in plain text (for development simplicity). For production:

1. Use Supabase Auth (`auth.users`) instead of custom password columns
2. Enable email/password authentication in Supabase dashboard
3. Update `AuthContext.jsx` to use `supabase.auth.signInWithPassword()`

### HTTPS
Always use HTTPS in production. All static hosting providers (Vercel, Netlify, etc.) provide free SSL certificates.

---

## 7. SMS Reminders Setup (Optional)

To enable fee reminder SMS:

1. Create a Supabase Edge Function named `send-fee-reminder`
2. Configure with your SMS provider (Twilio, MSG91, etc.)
3. The function receives `{ studentId }` in the request body
4. Look up the student's parent phone number and send the SMS

Example Edge Function structure:
```typescript
import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

serve(async (req) => {
  const { studentId } = await req.json()
  // Look up student, parent phone, unpaid fees
  // Send SMS via your provider
  return new Response(JSON.stringify({ success: true }))
})
```

---

## 8. Backup & Maintenance

### Database Backups
- Supabase Pro plan includes automatic daily backups
- For free tier: Export data regularly via the Supabase dashboard

### Monitoring
- Check Supabase dashboard for API usage, database size, and errors
- Set up Supabase alerts for unusual activity

### Updates
```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build
```

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Supabase environment variables" | Check `.env` file exists with correct values |
| API errors / CORS issues | Verify Supabase URL doesn't include `/rest/v1` |
| Blank page after deploy | Ensure SPA fallback is configured for your hosting |
| RLS policy errors | Check that development policies are in place or add proper production policies |
| SMS not sending | Deploy the Edge Function and configure SMS provider credentials |

---

## 10. Support

For technical support:
- Check the [USER_GUIDE.md](./USER_GUIDE.md) for feature documentation
- Review Supabase documentation at [supabase.com/docs](https://supabase.com/docs)
- For custom development, contact your school's IT administrator

---

*© Sri Guru Nanak Public School — ERP System v2.0*
