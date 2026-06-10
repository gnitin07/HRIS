# Devriz HRMS Deployment Guide

This guide outlines two deployment phases based on the user load:
1. **Initial Testing (5-10 users)**: Using free-tier services.
2. **Production Scale (100 users/day)**: Upgrading to paid tiers and more robust infrastructure.

---

## Phase 1: Initial Testing (5-10 users)
For initial testing, we recommend a completely **free-tier stack**:
- **Frontend (Client)**: Vercel or Netlify
- **Backend (Server)**: Render or Railway
- **Database**: Neon (Serverless Postgres) or Supabase

### Step 1: Database (Neon)
1. Sign up at [Neon.tech](https://neon.tech).
2. Create a new Postgres database.
3. Get the connection string (it looks like `postgresql://user:password@endpoint...`).
4. Run your schema and migration scripts on this database.

### Step 2: Backend (Render)
1. Push your entire repository to GitHub.
2. Sign up at [Render.com](https://render.com) and create a new **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Environment Variables:
   - `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` (from Neon)
   - `JWT_SECRET`: Generate a random string
   - `EMAIL_USER`, `EMAIL_PASS`: Your Gmail credentials for notifications
   - `PORT`: `3000`
6. Deploy. Note the Render URL (e.g., `https://devriz-hrms.onrender.com`).

### Step 3: Frontend (Vercel)
1. Go to `client/vite.config.js` and remove the proxy (it's only for local dev).
2. Update your `client/src/api/axios.js` (or wherever you define the base URL) to use the Render backend URL (e.g., `https://devriz-hrms.onrender.com/api`). Or better yet, use an environment variable `VITE_API_URL`.
3. Sign up at [Vercel.com](https://vercel.com) and import your GitHub repo.
4. Settings:
   - Root Directory: `client`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_URL`: Your Render backend URL
6. Deploy.

---

## Phase 2: Production Scale (100 users/day)
Once your user base scales to 100 users checking in and out concurrently, the free tiers will hit rate limits and sleep states.

### Step 1: Upgrading the Database
- **Neon Pro** or **Supabase Pro** (~$25/mo).
- Free tiers often limit concurrent connections (e.g., 50 connections). When scaling, you need a higher limit or a **connection pooler**.
- In Render, if you decide to host PostgreSQL there, pick at least a $7/mo instance.
- Set up **daily backups**.

### Step 2: Upgrading the Backend (Render)
- The free Render tier goes to sleep after 15 minutes of inactivity, causing a 30-50 second delay on the next request.
- Upgrade to a **Starter Web Service ($7/mo)** so it stays awake 24/7.
- Implement **Rate Limiting**: Add `express-rate-limit` to prevent brute force attacks on `/login` and `/checkin`.
- Implement proper **CORS**: Ensure `cors` is configured to only allow requests from your Vercel frontend domain.

### Step 3: Upgrading the Frontend (Vercel)
- The free tier of Vercel is usually sufficient for 100 users/day.
- Connect a **Custom Domain** (e.g., `hrms.devriz.com`). Vercel provides free auto-renewing SSL certificates.

### Step 4: Code / Infrastructure Optimizations
- **Node Clustering / PM2**: Use PM2 to run multiple Node processes to handle concurrent requests better.
- **Monitoring**: Add a tool like Sentry to track server crashes and frontend bugs.
- **Email Service**: Gmail has sending limits. Switch to a professional transactional email provider like **Resend, SendGrid, or AWS SES**.
