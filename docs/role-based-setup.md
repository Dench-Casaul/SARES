# SARES Role-Based Setup

This rollout provisions a dedicated superadmin account and two counselor accounts. Counselors have the same application functions as the superadmin, but only see their school level plus shared records. Superadmin access spans all scopes and keeps the existing app features, including student and violation management, rules, reports, case assessments, account security, and all-scope evidence access.

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

Evidence files are stored under `evidence/{school_scope}/{batchId}/{filename}`. Legacy evidence paths are superadmin-only after Storage rules are deployed. The migration moves evidence for linked violations, removes stored download-token URLs, and attempts to invalidate legacy download tokens.

## Migration And Deployment

1. Create the Auth accounts and their matching role profiles in Firebase Console.
2. Install the Google Cloud SDK and authenticate Application Default Credentials with an operator identity that can read/write the Firestore database and Storage bucket:

   ```powershell
   gcloud auth application-default login
   $env:GCLOUD_PROJECT = "sares-system"
   ```

3. From `frontend`, run the migration in dry-run mode and review the totals before applying it:

   ```powershell
   npm run backfill:school-scope
   npm run backfill:school-scope -- --apply
   ```

   The dry run changes no data. The apply run normalizes student/violation scopes, moves linked evidence by scope, removes download-token URLs from records, and writes a completion marker to `rules/school_scope_migration`. Back up Firestore and Storage before applying. Do not deploy the new rules until the backfill is complete.

4. Deploy the updated frontend and Firebase rules in a coordinated release. Old clients issue unfiltered queries and will stop working as soon as scope-enforcing rules are active. Deploy rules from the repository root:

   ```powershell
   firebase login
   firebase deploy --only firestore:rules,storage --project sares-system
   ```

5. Verify sign-in and role profile access for all three accounts. Check elementary/high-school separation, shared records, a current-grade transfer, and evidence access before ending the maintenance window.

## Validation

From `frontend`:

```powershell
npm test
npm run test:rules
npm run build
```

`npm run test:rules` starts Firestore and Storage emulators using the root `firebase.json` and verifies scoped query requirements, cross-school denials, linked-student writes, role self-promotion denial, and evidence access.
