# W6 A/B Testing Web App

This project updates the earlier Google OIDC single-page application into a Week 6 assignment-ready web app. It now includes:

- a static intro page,
- Google login,
- two distinct logged-in home page variants,
- random A/B assignment,
- sticky session behavior, and
- interaction metrics capture.

## Assignment Alignment

This version satisfies the core Week 6 requirements:

1. **Static Intro Page**
   - The landing page explains the app and provides access to login.

2. **Two Home Page Versions**
   - After sign-in, users see either **Home Page A** or **Home Page B**.
   - Each version has different text and buttons so the pathway is obvious.

3. **A/B Testing Logic**
   - The server randomly assigns a user to Version A or B.
   - Assignment is stored in the session and in a small JSON file so the user remains sticky across later visits.

4. **Metrics Capture**
   - Button clicks are posted to the server and saved in `data/metrics.json`.
   - Each metric includes:
     - user name
     - user email
     - page version
     - button ID and label
     - IP address
     - timestamp

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express
- express-session
- Google Identity Services

## Project Structure

```text
.
├── data/
│   ├── metrics.json
│   └── user-assignments.json
├── index.html
├── package.json
├── README.md
├── script.js
├── server.js
└── styles.css
```

## Setup Instructions

### 1. Install dependencies

From the project folder, run:

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

The app will run at:

```text
http://localhost:5500
```

### 3. Sign in with Google

The current client ID is already present in `script.js`. If you need to replace it, update this line:

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
```

If you change the port, be sure your Google OAuth configuration includes the correct local origin.

## How the A/B Test Works

1. The user signs in with Google.
2. The browser sends the basic profile to `POST /api/assign`.
3. The Express server randomly assigns the user to Version A or B.
4. The assignment is stored in:
   - the server session, and
   - `data/user-assignments.json`
5. On later visits, the same user keeps the same version.

## How Metrics Are Captured

When the user clicks a button on either version:

- the browser sends a request to `POST /api/track`
- the server records the interaction in `data/metrics.json`
- the app refreshes the on-screen metrics table

This provides a simple demonstration of user behavior tracking for the assignment video.

## GitHub Upload Steps

If you want to replace your existing repository contents with this updated version:

```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

Copy these updated files into that folder, then run:

```bash
git add .
git commit -m "Update project for W6 A/B testing assignment"
git push origin main
```

## Suggested Demo Flow for Your Video

1. Show the intro page.
2. Explain that Google sign-in is reused from the earlier assignment.
3. Sign in and show the assigned version.
4. Refresh the page to prove stickiness.
5. Click the buttons to show metrics being captured.
6. Open `data/metrics.json` and `data/user-assignments.json` to explain stored data.

## Important Note

This project is designed for academic demonstration purposes. A production system would validate identity tokens server-side and would typically store assignments and metrics in a database instead of JSON files.
