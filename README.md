# Gym Workout Tracker — Backend

Express + MongoDB (Atlas) + Cloudinary backend for the personal Gym Workout Tracker app.
Images/videos are never stored on the server or in the database — only Cloudinary URLs are stored.

## ⚠️ Before you do anything else

Credentials for MongoDB Atlas and Cloudinary were shared in plain text during this build.
**Rotate both before using this in anything beyond local testing:**

1. **MongoDB Atlas** → Database Access → edit user `jaynil` → reset password (or delete and create a new user). Update `MONGO_URI` in `.env`.
2. **Cloudinary** → Settings → Security → regenerate the API secret. Update `CLOUDINARY_API_SECRET` in `.env`.
3. Never paste `.env` values into chat, commits, or screenshots. `.env` is already git-ignored here.

## Setup

```bash
npm install
```

`.env` is already populated with the values you provided (a random `JWT_SECRET` was generated for you). Update it after rotating credentials.

## Seed the default workout plan

Populates Days 1–7 with your exact workout plan (this clears existing WorkoutDay/Exercise data first):

```bash
npm run seed
```

## Run

```bash
npm run dev     # nodemon, auto-restart
npm start       # plain node
```

Server listens on `PORT` (default 5000). Health check: `GET /api/health`.

> Note: I could not verify a live connection to MongoDB Atlas or Cloudinary from this sandbox (outbound network here is restricted to package registries). All files pass a Node syntax check; please run `npm run seed` yourself the first time to confirm connectivity, and watch the console for connection errors.

## API Reference

### Auth
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | Creates user, returns JWT |
| POST | `/api/auth/login` | `{ email, password, rememberMe }` | `rememberMe: true` issues a 30-day token instead of 1-day |
| GET | `/api/auth/me` | — (Bearer token) | Current user |

### Workout Days (Week 1 screen)
| Method | Route | Notes |
|---|---|---|
| GET | `/api/workout-days` | List Day 1–7 with exercise counts, for the day cards |
| GET | `/api/workout-days/:dayNumber` | Full day with ordered exercises; Day 7 returns rest-day content instead |

### Exercises
| Method | Route | Notes |
|---|---|---|
| GET | `/api/exercises/:id` | Exercise Details screen (image, benefits, tips, mistakes, video) |
| PUT | `/api/exercises/:id` | Edit Exercise |
| DELETE | `/api/exercises/:id` | Delete Exercise (also removes its Cloudinary image/video) |
| POST | `/api/exercises/:id/image` | multipart `image` field → uploads to Cloudinary, saves URL only |
| POST | `/api/exercises/:id/video` | multipart `video` field → uploads to Cloudinary, saves URL only |

### Workout History
| Method | Route | Notes |
|---|---|---|
| POST | `/api/workout-history` | Log a completed exercise (Done button): `{ exerciseId, workoutDayId, sets, notes, date }` |
| GET | `/api/workout-history/exercise/:exerciseId` | Previous sessions, for "Previous Workout" display |
| POST | `/api/workout-history/sync` | Bulk upload of offline-cached sessions: `{ entries: [...] }` |

### Progressive Overload
| Method | Route | Notes |
|---|---|---|
| GET | `/api/progressive-overload/:exerciseId` | Compares last 2 sessions → `{ suggestion, isPersonalRecord }` |

All routes except `/api/auth/signup`, `/api/auth/login`, and `/api/health` require `Authorization: Bearer <token>`.

## What's here vs. what's not

Built strictly to your spec: auth, 7-day plan, exercise cards/details, images/videos via Cloudinary URL only, edit/delete exercise, workout history, progressive overload, and a sync endpoint for the local cache. No admin/coach panels, no social features, no analytics dashboards, no extra screens — matches your "do not add" list.

## Next steps

- Upload your real exercise images/videos via the `/image` and `/video` endpoints (or a small script) so `imageUrl` isn't empty — seeding intentionally leaves media blank since I can't invent Cloudinary assets for you.
- Frontend (Expo/React Native) is a separate phase — say the word when you're ready and I'll scaffold it against these exact endpoints.
