# Space Learning Universe

A small educational web app that uses NASA APIs to create missions and quizzes, with user accounts, XP and leaderboards.

Quick start

1. Copy `.env.example` to `.env` and fill in values (especially `MONGO_URI` and `SESSION_SECRET`).
2. Install dependencies:

```powershell
npm install
```

3. Start the app:

```powershell
npm start
```

Dev mode (auto-restarts with file changes):

```powershell
npm install -g nodemon; npm run dev
```

Notes & suggestions
- Add tests and linting (ESLint).
- Replace hard-coded session secret in `app.js` with `process.env.SESSION_SECRET` (app already reads `.env`).
- Consider removing `bcrypt` if not used; this project uses `bcryptjs`.
- Secure cookies and set cookie options for production.
- Add input validation and rate-limiting on auth routes.


Video : https://www.youtube.com/watch?v=3BY9CQHaNmk

Contact
- Email: abhishekwandhekar4@gmail.com
- Linkedn : https://www.linkedin.com/in/abhishek-wandhekar-302172293
