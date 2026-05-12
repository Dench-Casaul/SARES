# SARES
Sanction Recommendation Using a Rule-Based Expert System Derived from the School Student Handbook

## Overview
SARES is a React + Vite frontend for an expert sanction recommendation system derived from a school student handbook. The system combines Firebase Authentication, Firestore, and a rule engine that evaluates student violations against handbook sanction schedules, repeat-offense escalation, and handbook category tracking.

## Implemented Features

### Frontend application
- React app bootstrapped with Vite.
- Client-side routing using `react-router-dom`.
- App routes for:
  - `/login` — secure sign-in page with email/password authentication and password visibility toggle.
  - `/sares/dashboard` — dashboard landing page.
  - `/sares/students` — student management/listing page.
  - `/sares/violation` — violation logging page with selection workflows.
  - `/sares/rules` — rule management page.
  - `/sares/case-assessment` — post-submit case assessment page for reviewing the saved violation.
  - `/sares/reports` — reporting page.
- App-level error boundary that catches rendering failures and shows a user-friendly message.

### Authentication & user flow
- Firebase Authentication integration using `signInWithEmailAndPassword`.
- Firestore lookup for user profile details from `users` collection.
- LocalStorage caching of authenticated user info.
- Branded login experience with school logos and a modern login card UI.

### Firestore progress
- Current Firestore collections in use:
  - `users`
  - `students`
  - `offense_categories`
  - `rules`
  - `violations`
- `offense_categories` currently separates handbook tracks using `handbook_track` values:
  - `major`
  - `minor`
- `rules` documents have been started for handbook offenses `R-001` through `R-015`, with fields such as:
  - `rule_id`
  - `handbook_number`
  - `category_id`
  - `category_name`
  - `handbook_track`
  - `offense_variety`
  - `description`
  - `severity`
  - `recommended_sanction`
  - `provision`
  - `active`
- `created_at` and `updated_at` are optional audit fields; when entered in the console they must be valid Firestore timestamps.

### Violation logging flow
- Violation page with searchable student, category, and rule selection.
- Firestore data fetching for `students`, `offense_categories`, `rules`, and `violations`.
- Student profile can redirect directly to Log Violation and prefill the selected student.
- Selected student, category, and rule drive the sanction engine preview during submit flow.
- Violation submission stores the computed recommendation in Firestore and redirects to the case assessment page.
- The temporary pre-submit expert preview panel was removed so the form stays clean.

### Rule engine
- `frontend/src/engine/ruleEngine.js` implements the sanction recommendation logic.
- Supports both:
  - handbook schedule evaluation for Section IV sanctions,
  - legacy repeat offense escalation when handbook categories are not configured.
- Rule engine functions include:
  - `buildViolationFacts()` — prepares facts for the current student, rule, and category.
  - `buildHandbookFacts()` — aggregates prior in-year offenses by handbook track.
  - `resolveHandbookSanctionTrackAndTier()` — maps minor/major incident history to handbook sanction tiers.
  - `evaluateRecommendation()` — computes recommended sanctions, severity, and tier notes.
- `evaluateSaresRecommendation()` is the main entry point used by Log Violation.
- Repeat escalation behavior includes tiered sanctions and severity bumps for second and third offenses.
- Handbook mode uses stored `handbook_track` values and school-year history.

### Handbook data and explainability
- `frontend/src/data/handbookIndex.js` loads and indexes handbook metadata from `generalizedHandbook.json`.
- Supports deterministic lookup of:
  - handbook offenses by number,
  - offense lists by handbook category,
  - sanction schedule tiers for major/minor offenses,
  - sanction forms and repeated escalation patterns.
- `frontend/src/data/generalizedHandbook.json` is the handbook source used to seed offense titles, descriptions, and section references.

### Styling and assets
- Project includes custom CSS files for page layouts, forms, sidebar navigation, and branding.
- Uses `lucide-react` for iconography.
- Includes school branding assets in `frontend/src/assets`.

### UI updates already made
- Rule Management now includes an `Enable All` toggle beside the search bar.
- Rule cards now emphasize the offense variety label and show the category as the smaller tag.
- Student profiles can send the user directly to Log Violation with the student auto-selected.
- A new Case Assessment screen now appears after saving a violation, using the same SARES visual language as the other tabs.

## Project structure
- `README.md` — root project overview.
- `frontend/` — React application.
  - `src/App.jsx` — route setup and error boundary.
  - `src/firebase.js` — Firebase initialization.
  - `src/engine/ruleEngine.js` — business logic for sanction recommendations.
  - `src/data/handbookIndex.js` — handbook data helpers.
  - `src/pages/` — page components for Login, Dashboard, Students, Violation, Rule, Case Assessment, Reports.
  - `src/css/` — page-specific styles.
  - `src/assets/` — branding and image assets.

## Getting started
From the `frontend` folder:

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Firebase requirements
The app expects Firebase configuration in `frontend/firebase.js` and Firestore collections such as:
- `users`
- `students`
- `offense_categories`
- `rules`
- `violations`

## Notes
This README documents the current implementation state of the project, including the frontend workflow, rule management work, handbook-backed sanction engine, and the new post-submit case assessment page. Further enhancements can extend reporting, rule administration, decision overrides, and AI-generated explanations.
