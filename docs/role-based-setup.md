# SARES Role-Based Setup

This rollout provisions a dedicated superadmin account and two counselor accounts. Counselors have the same application functions as the superadmin, but only see their school level plus shared records. Superadmin access spans all scopes and keeps the existing app features, including student and violation management, rules, reports, case assessments, and account security. Evidence upload is disabled for this no-billing rollout; new violation records have no evidence files.

## Account Profiles

The dedicated superadmin Firebase Authentication account has been created separately as `admin@ows.edu.ph`; its matching Firestore profile is also provisioned below. This address is a Firebase Email/Password sign-in identifier and does not need to receive email. Do not change, delete, or reuse the UID of an existing account. For a future deployment, create a separate account with an unused `@ows.edu.ph` address. Create `guidance.elem@ows.edu.ph` and `guidance.hs@ows.edu.ph` as the counselor accounts. Set passwords directly in Firebase and never store them in source control, a Firestore profile, a script, or deployment configuration. Users can change their password in SARES under Account Security.

For each Auth UID, create `users/{uid}` in Firestore from the Console, including a **new profile for the new superadmin UID**. Include:

| Account | Email | `role` | `school_scope` |
| --- | --- | --- | --- |
| Superadmin | `admin@ows.edu.ph` | `superadmin` | `all` |
| Elementary counselor | `guidance.elem@ows.edu.ph` | `counselor` | `elementary` |
| High-school counselor | `guidance.hs@ows.edu.ph` | `counselor` | `high_school` |

Each profile should also include `user_id` (the matching Auth UID), `email`, and `full_name`. `email` must match the Auth user. The app and Firebase rules grant the new account the same superadmin capabilities based on this profile; no existing account needs to be changed. Role profiles are read-only to app clients; role changes are made by an authorized operator in Firebase Console.

## Data Scopes

- Kindergarten through 6th Grade: `elementary`
- 7th through 10th Grade: `high_school`
- Missing or unrecognized year levels, including grades not currently supported in the app: `shared`
- Violation history follows the student's current grade. Orphaned violations use their own recognized year level, otherwise `shared`.

Evidence upload is disabled because the project is not using Cloud Storage. The migration will retain any existing evidence references and will only move evidence files if evidence is present and a Storage bucket is available.

## System Activity Log

The superadmin-only **System Logs** sidebar tab shows the latest 200 successful sign-ins, sign-outs, password changes, student changes, violation/case actions, suspension-date changes, and handbook updates across school scopes. Firestore rules restrict reads to the superadmin, tie new entries to the caller's provisioned UID/email/role/scope, and disallow log edits or deletes. No student names or descriptions are copied into the log.

Because this rollout keeps billing disabled and writes remain client-side, these entries are **client-reported, not tamper-proof audit evidence**: a modified client can omit or misstate its own activity. Failed sign-in attempts are not included. Trusted, complete audit capture requires a server-side component and a separate billing/deployment decision.

## Optional AI Prevention Suggestions

The violation form lets the counselor opt in to a short prevention/alternative suggestion based on an anonymized incident narrative. The narrative is optional when AI is off and required only when AI is enabled. Before enabling, the form warns not to submit confidential or identifying details. The AI endpoint receives only the narrative and selected violation category/type (not student or reporter profile fields), requires a valid signed-in Firebase account with a provisioned SARES role, and does not decide or change sanctions. Free-tier Google Gemini content may be used to improve Google's services; do not use AI for sensitive narratives.

Configure `GEMINI_API_KEY` and `FIREBASE_WEB_API_KEY` as server-side Vercel environment variables for the production deployment. `FIREBASE_PROJECT_ID` may be set to `sares-system`; the endpoint defaults to that project. Never expose the Gemini API key in frontend code. If AI is unavailable or not configured, the violation can still be submitted without an AI suggestion.

## Progressive Web App

SARES can be installed from a supported browser and launched in a standalone app window. The service worker caches only the app shell and built static assets; it does not cache Firebase data, authentication/API responses, or student records. An internet connection is required to sign in, access records, and use AI suggestions. When offline, SARES displays a connection notice rather than offering offline record access.

## Migration And Deployment

1. Create the Auth accounts and their matching role profiles in Firebase Console.
2. Install the Google Cloud SDK and authenticate Application Default Credentials with an operator identity that can read/write the Firestore database:

   ```powershell
   gcloud auth application-default login
   $env:GCLOUD_PROJECT = "sares-system"
   ```

3. From `frontend`, run the migration in dry-run mode and review the totals before applying it:

   ```powershell
   npm run backfill:school-scope
   npm run backfill:school-scope -- --apply
   ```

   The dry run changes no data. The apply run normalizes student/violation scopes and writes a completion marker to `rules/school_scope_migration`. Back up Firestore before applying. Evidence upload remains disabled and Storage rules are not part of this no-billing rollout. Do not deploy the new Firestore rules until the backfill is complete.

4. Deploy the updated frontend and Firebase rules in a coordinated release. Old clients issue unfiltered queries and will stop working as soon as scope-enforcing rules are active. Deploy rules from the repository root:

   ```powershell
   firebase login
   firebase deploy --only firestore:rules --project sares-system
   ```

5. Verify sign-in and role profile access for all three accounts. Check elementary/high-school separation, shared records, a current-grade transfer, and confirm violation submission works without evidence files before ending the maintenance window.

## Validation

From `frontend`:

```powershell
npm test
npm run test:rules
npm run build
```

`npm run test:rules` starts Firestore and Storage emulators using the root `firebase.json` and verifies scoped query requirements, cross-school denials, linked-student writes, role self-promotion denial, and evidence access rules.
