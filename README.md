# SARES

Sanction Recommendation Using a Rule-Based Expert System derived from the school student handbook.

## What This Project Is

SARES is a React + Vite web app that helps school staff log student violations and generate sanction recommendations based on handbook rules, offense history, and repeat-offense escalation.

Core pieces:
- Firebase Authentication for login
- Firestore for app data (`users`, `students`, `offense_categories`, `rules`, `violations`)
- A local rule engine in `frontend/src/engine/ruleEngine.js`

## Tech Stack

- React 19
- Vite 8
- React Router
- Firebase (Auth + Firestore)
- Lucide React icons

## Project Structure

```text
SARES/
  README.md
  frontend/
    package.json
    src/
      App.jsx
      firebase.js
      engine/ruleEngine.js
      data/generalizedHandbook.json
      data/handbookIndex.js
      pages/
      css/
```

## Prerequisites

Install the following before setup:
- Node.js 18+ (Node.js 20 LTS recommended)
- npm 9+
- A Firebase project with Authentication and Firestore enabled

## Setup and Installation

1. Clone the repository: 
```bash
git clone <your-repo-url>
cd SARES
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Configure Firebase:
- Open `frontend/src/firebase.js`
- Replace the Firebase config object with your Firebase project credentials
- Make sure Email/Password authentication is enabled in Firebase Console

4. Prepare Firestore collections:
- `users`
- `students`
- `offense_categories`
- `rules`
- `violations`

Minimum expected fields include:
- `offense_categories.handbook_track` (`major` or `minor`)
- `rules` records with identifiers (`rule_id`, `handbook_number`) and sanction metadata (`severity`, `recommended_sanction`, `active`)

## Running the App

From the `frontend` directory:

```bash
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Build for Production

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Usage Guide

1. Go to `/login` and sign in with a Firebase Auth account.
2. Open Dashboard (`/sares/dashboard`) for navigation.
3. Manage students in `/sares/students`.
4. Log a violation in `/sares/violation`:
   - select student
   - select offense category and rule
   - submit violation
5. Review generated recommendation in `/sares/case-assessment`.
6. View rule controls in `/sares/rules` and summaries in `/sares/reports`.

## Available Scripts

From `frontend`:

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Notes

- Sanction recommendations are computed by `evaluateSaresRecommendation()` in `frontend/src/engine/ruleEngine.js`.
- Handbook mapping data comes from `frontend/src/data/generalizedHandbook.json`.
- If data is incomplete in Firestore (especially `rules` and `offense_categories`), recommendation output may be limited.
