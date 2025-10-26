# Constant Lists

A modern Magic: The Gathering deck-building web app inspired by moxfield.com.

## Features
- User authentication (JWT)
- Deck builder, card search (Scryfall API)
- User profile, deck list, deck view/edit
- Responsive, accessible UI with navigation
- Premium foil card visual effects
- Advanced card actions modal with printing selection
- Rate limiting, error handling, validation
- Deck import/export (CSV)
- Server-side pagination
- Testing (backend & frontend)
- Stubs for password reset, email verification, OAuth, comments, likes, sharing

## User Flows
- **Register/Login:** User creates an account or logs in. JWT stored in localStorage.
- **Deck Building:** Authenticated user creates, edits, imports, exports, and deletes decks.
- **Card Search:** Any user can search for cards using Scryfall API.
- **Profile:** Authenticated user views their info and decks.
- **Card Actions:** Users can select different printings, toggle foil status, and adjust quantities.
- **Community (future):** Users can comment, like, and share decks (planned).

## UI Improvements
- Rainbow shimmer effect for foil card names
- Rainbow overlay effect for foil card previews
- Modern toggle switch for foil selection
- Improved card actions modal with printing selection grid
- Enhanced group and sort options

## Getting Started
- `npm install` (root and server)
- `npm run dev` (frontend)
- `cd server && npm run dev` (backend)

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.
See [UI-IMPROVEMENTS-SUMMARY.md](UI-IMPROVEMENTS-SUMMARY.md) for UI enhancement details.

## API Docs
- See `server/routes/*.js` for endpoints
- See `server/routes/authExtras.md` and `server/routes/communityFeatures.md` for stubs

## Monitoring & Analytics
- See [MONITORING.md](MONITORING.md)

## Project Checklist
- [x] Auth (register/login)
- [x] Deck builder & CRUD
- [x] Card search
- [x] Profile page
- [x] Deck import/export
- [x] Basic tests
- [ ] Community features (comments, likes, sharing)
- [ ] Auth extras (password reset, email verification, OAuth)
- [ ] More tests (backend & frontend)
- [ ] Production monitoring/analytics

---
MIT License
