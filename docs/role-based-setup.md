# SARES Role-Based Setup

This rollout provisions three accounts and scopes counselor access by the student's current grade. Counselors have the same application functions as the superadmin, but only see their school level plus shared records. Superadmin access spans all scopes.

## Account Profiles

Create or update accounts in Firebase Authentication using the Firebase Console. Preserve the existing account UID when changing its email to `admin@ows.edu.ph`. Create `guidance.elem@ows.edu.ph` and `guidance.hs@ows.edu.ph` as the counselor accounts. Do not store passwords in source control, Firestore profiles, shell scripts, or deployment configuration. The supplied passwords were shared in chat; rotate them before production where possible. Users can change their password in SARES under Account Security.

For each Auth UID, create `users/{uid}` in Firestore from the Console. Include:

| Account | `role` | `school_scope` |
| --- | --- | --- |
| Superadmin | `superadmin` | `all` |
| Elementary counselor | `counselor` | `elementary` |
| High-school counselor | `counselor` | `high_school` |

Each profile should also include `user_id`, `email`, and `full_name`. `email` must match the Auth user. Role profiles are read-only to app clients; role changes are made by an authorized operator in Firebase Console.

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
