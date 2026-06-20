# Live Mushaira Feature – Complete Developer Specification

**Module Name:** Live Mushaira

This module contains 3 sections:

- Live Now
- Schedule
- Ended

**Design style:** Dark background, gold accent, rounded cards, responsive (mobile + web), real-time updates.

---

## 1. Live Now Page

### Purpose
Show currently running Mushaira sessions.

### Header
- Live Mushaira logo
- Search button
- Notification icon
- User profile

### Top Tabs
`[ Live Now ] [ Schedule ] [ Ended ]` — active tab highlighted.

### Main Live Card
- Session title, LIVE badge, category tags (Poetry, Shayari, Urdu)
- Live statistics: viewers, likes, session duration
- **Join Live** → opens live room

### Speakers Section
Host, speakers, guests — photo, name, role (Host / Speaker / Guest). **View All**.

### Audience Section
Audience avatars, total count. **View All Audience**.

### User Interaction (Live Room)
- Mic Off (default for audience)
- Raise Hand / Request To Speak
- React (❤️ 👏 🔥)
- Share (copy live link)
- Live chat (text, emoji, pin, delete own)

### Donation System
Coins, gifts, stars — top donors, recent donations.

### Host Controls
Start / Pause / Resume / End Live, mute/remove/add speaker, pin message.

### Live Room States
Waiting (countdown), Live Running, Paused, Ended (moves to Ended section).

---

## 2. Schedule Page

### Purpose
Display upcoming events.

### Date Filter
Today · Tomorrow · Weekly

### Schedule Card
Thumbnail, title, start time, host, guests, category.

**Buttons:** Set Reminder · View Details

### Reminder System
Notifications 1 hour and 15 minutes before start.

### Session Details Page
Cover, title, description, host, guests, time, duration, category, join reminder.

### Admin
Create / edit / delete events, change time, add guests, upload thumbnail.

---

## 3. Ended Page

### Purpose
Archive of past sessions.

### Filters
Date · Category · Most Viewed

### Session Card
Thumbnail, title, date, duration, views, likes.

**Buttons:** Watch Replay · View Details

### Replay Player
Play, pause, seek, fullscreen + comments, likes, shares.

---

## Cross-Cutting

- Search (poet, title, category)
- Notifications (live started, reminder, mention, gift, comment)
- Admin dashboard metrics

---

## Database Collections (Target Schema)

See `supabase/live-mushaira-v2.sql` for PostgreSQL tables:

- `live_sessions`
- `session_speakers`
- `session_audience`
- `session_comments`
- `session_reactions`
- `session_donations`
- `session_reminders`

---

## API Endpoints (Target)

| Method | Endpoint |
|--------|----------|
| GET | `/live-now`, `/schedule`, `/ended`, `/session-details/{id}`, `/comments/{session_id}`, `/donations/{session_id}` |
| POST | `/start-live`, `/end-live`, `/join-live`, `/request-speaker`, `/send-comment`, `/send-reaction`, `/send-donation`, `/create-schedule` |
| PUT | `/update-schedule` |
| DELETE | `/delete-schedule`, `/remove-speaker` |

---

## Real-Time Stack (Recommended)

| Layer | Options |
|-------|---------|
| Frontend | Current: Vanilla JS + Supabase Realtime; Future: Flutter optional |
| Backend | Node / Laravel / NestJS |
| Database | PostgreSQL (Supabase) |
| Real-time | Socket.IO / Supabase Realtime |
| Media | Agora SDK (recommended), Zego, or WebRTC (current) |

---

## Final Requirements Checklist

- [x] Mobile responsive UI shell (Live / Schedule / Ended)
- [x] Dark + gold theme
- [x] Join Live → WebRTC room with seats, chat, host end
- [ ] Real-time audience count (partial — presence in room)
- [x] Live chat (room chat)
- [ ] Raise hand system
- [x] Speaker management (seats + host controls, partial)
- [x] Schedule reminder (local register)
- [ ] Replay videos
- [ ] Donation system
- [x] Notifications (app notifications page)
- [x] Admin controls (admin panel + host end event)
- [ ] Full API + DB schema (SQL provided, migration pending)

---

*Last updated: project implementation in progress on Supabase + vanilla JS stack.*
