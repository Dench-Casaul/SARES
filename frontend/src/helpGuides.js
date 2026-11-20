/**
 * How-to Guide content (shown on /sares/help). Step-by-step instructions for
 * common tasks, written to match the labels on screen. When a screen changes,
 * update the matching guide here.
 *
 * `superadminOnly` guides are hidden from counselors.
 */

export const GUIDE_CATEGORIES = Object.freeze([
  { id: 'start', label: 'Getting started' },
  { id: 'students', label: 'Students' },
  { id: 'incidents', label: 'Recording incidents' },
  { id: 'cases', label: 'Managing cases' },
  { id: 'reports', label: 'Reports' },
  { id: 'rules', label: 'Rules and school year' },
  { id: 'admin', label: 'Administration' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
]);

export const GUIDES = Object.freeze([
  // ---- Getting started ----------------------------------------------------
  {
    id: 'sign-in',
    category: 'start',
    title: 'Sign in and sign out',
    summary: 'Use your school account. SARES signs you out automatically when you leave it idle.',
    steps: [
      'Open SARES and choose Login.',
      'Enter your school email (ending in @ows.edu.ph) and password.',
      'Agree to the Privacy Policy and Terms of Use, then sign in.',
      'When you are done, select Logout at the bottom of the sidebar.',
    ],
    tips: [
      'You are signed out after 30 minutes without activity, and when you close the browser tab.',
      'On a shared computer, always log out before leaving.',
    ],
  },
  {
    id: 'guided-tour',
    category: 'start',
    title: 'Use the guided tour on any page',
    summary: 'The ? button walks you through the page you are on.',
    steps: [
      'Select the round ? button at the bottom-right of the screen.',
      'Follow the highlighted areas with Next and Back.',
      'Press Esc or select the close button to stop the tour at any time.',
    ],
    tips: ['You can drag the ? button to another spot if it covers something.'],
  },
  {
    id: 'change-password',
    category: 'start',
    title: 'Change your password',
    summary: 'Update your password from Account Security.',
    link: { to: '/sares/account', label: 'Open Account Security' },
    steps: [
      'Open Account Security from the sidebar.',
      'Enter your current password.',
      'Enter a new password of at least 12 characters, then type it again to confirm.',
      'Select Update password.',
    ],
    tips: ['A short phrase is easier to remember than random symbols. Do not reuse a password from another account.'],
  },

  // ---- Students -------------------------------------------------------------
  {
    id: 'add-student',
    category: 'students',
    title: 'Add a student',
    summary: 'Create a student record before logging a violation for them.',
    link: { to: '/sares/students', label: 'Open Students' },
    steps: [
      'Open Students from the sidebar and stay on the Student List tab.',
      'Select Add Student.',
      "Enter the student's LRN, first, middle, and last name, year level, and section.",
      'Add contact numbers if available (student and parent/guardian).',
      'Save the student.',
    ],
    tips: ['The year level decides the school level (Elementary or High School), and with it which sanction schedule applies.'],
  },
  {
    id: 'find-student',
    category: 'students',
    title: "Find a student and view their record",
    summary: 'Search the list, then open the student to see their disciplinary history.',
    link: { to: '/sares/students', label: 'Open Students' },
    steps: [
      'Open Students from the sidebar.',
      'Type a name or LRN in the search box.',
      "Select the student's row to open their profile.",
      'Scroll to Disciplinary History. Select any case to open its Violation Details.',
    ],
  },
  {
    id: 'edit-student',
    category: 'students',
    title: "Edit a student's information",
    summary: 'Correct details or update the year level when a student moves up.',
    link: { to: '/sares/students', label: 'Open Students' },
    steps: [
      'Open Students and find the student.',
      'Select the ⋮ button at the end of their row, then Edit.',
      'Update the information and save.',
    ],
    tips: ["If the new year level is in the other school level, the student and all their cases move to that school level's records."],
  },
  {
    id: 'trash-student',
    category: 'students',
    title: 'Remove, restore, or permanently delete a student',
    summary: 'Students go to Trash first, so a mistake can be undone.',
    link: { to: '/sares/students', label: 'Open Students' },
    steps: [
      'To remove: select ⋮ on the student\'s row, then Move to Trash, and confirm. Their cases are hidden with them.',
      'To restore: open the Trash tab and select Restore on the student.',
      'To delete for good: open the Trash tab, select Delete permanently, and confirm.',
    ],
    warnings: ['Permanent deletion removes the student and all their cases and cannot be undone. Activity logs keep only an internal ID, not the student\'s name.'],
  },

  // ---- Recording incidents ----------------------------------------------------
  {
    id: 'log-violation',
    category: 'incidents',
    title: 'Log a violation',
    summary: 'Describe what happened; SARES recommends the matching handbook offense and the handbook decides the sanction.',
    link: { to: '/sares/violation', label: 'Open Log Violation' },
    steps: [
      'Open Log Violation from the sidebar (or Log New Violation on the Dashboard).',
      'Step 1, Student & Date: select the student and the date the incident happened (not today, if it happened earlier).',
      'Step 2, Incident Report: describe what happened in plain words, then enter who reported it and their role. Reporter contact and witnesses are optional.',
      'Step 3, Recommended Offense: review the matches SARES found in your description and select the one that fits. If none fit, choose "None of these fit? Browse the handbook" and pick the offense yourself.',
      'Still in Step 3, choose the handling path: proceed with the sanction, or route to mediation first.',
      'Step 4, Review: check the offense number, the recommended sanction, and any warnings, then submit.',
      'The Case Assessment page opens. Print or download the Incident Report Form from there.',
    ],
    tips: [
      "Write the description without other people's names or private details. The selected students' names are replaced automatically before anything is sent to the AI.",
      'The AI only suggests the offense. You always confirm it, and the sanction comes from the handbook rules.',
    ],
  },
  {
    id: 'group-incident',
    category: 'incidents',
    title: 'Record an incident involving several students',
    summary: 'One report, with a separate case for each student.',
    link: { to: '/sares/violation', label: 'Open Log Violation' },
    steps: [
      'In Log Violation Step 1, select every student involved.',
      'Complete the remaining steps once for the whole incident.',
      "On the review step, check each student's own offense number and sanction.",
    ],
    tips: ["Each student is counted against their own record and school level, so their sanctions can differ."],
  },
  {
    id: 'offense-number',
    category: 'incidents',
    title: 'Understand the offense number and sanction',
    summary: 'How SARES counts offenses and picks the handbook sanction.',
    link: { to: '/sares/rules', label: 'Open the Handbook' },
    steps: [
      "SARES counts the student's earlier cases in the same offense level (Light, Less Serious, Serious, or Very Serious) and the same school year.",
      'This case is the next number: 1st offense, 2nd offense, and so on.',
      "The sanction for that number comes from the handbook schedule for the student's school level.",
    ],
    tips: [
      'Cases resolved through mediation do not count toward the offense number.',
      'Counts start over each school year, on the opening day set in Rule Management → School Year.',
      'Past the last offense listed in the handbook, the highest sanction applies and the case is flagged for the principal.',
    ],
  },

  // ---- Managing cases ---------------------------------------------------------
  {
    id: 'open-case',
    category: 'cases',
    title: 'Open a recorded case',
    summary: 'Two ways to reach a case after it is recorded.',
    steps: [
      "From Students: open the student, then select the case under Disciplinary History.",
      'From Reports: find the case in the Violation Log and select View.',
    ],
  },
  {
    id: 'case-status',
    category: 'cases',
    title: "Update a case's status",
    summary: 'Escalate mediation, mark cases served, or reopen them.',
    link: { to: '/sares/students', label: 'Open Students' },
    steps: [
      'Open the case (see "Open a recorded case").',
      'In Violation Details, open the Case Status menu.',
      'Choose the change, for example Escalate to Sanction, Mark as Resolved Through Mediation, Mark as Served, or Reopen.',
      'Confirm the change. Every change is recorded in the case history.',
    ],
    tips: ['Only changes that make sense for the current status are offered.'],
  },
  {
    id: 'suspension',
    category: 'cases',
    title: 'Set suspension dates',
    summary: 'For sanctions that include suspension.',
    steps: [
      'Open the case and select Set Suspension Date.',
      'Choose the Suspension Start and Suspension End dates.',
      'Select Save Suspension.',
    ],
    tips: ['The status shows Serving Suspension during those dates and changes to Served automatically after the end date.'],
  },
  {
    id: 'parent-involvement',
    category: 'cases',
    title: 'Record parent/guardian involvement',
    summary: 'Some sanctions require a reminder, conference, or written commitment from parents.',
    steps: [
      'Open the case and find Parent/Guardian Involvement.',
      'Next to each required step, select Record outcome.',
      'Enter the date, the parent or guardian, and what happened, then select Save.',
    ],
    tips: ['Required steps come from the handbook sanction, so they appear automatically.'],
  },
  {
    id: 'print-report',
    category: 'cases',
    title: 'Print or download the Incident Report Form',
    summary: 'The official form for signatures and filing.',
    steps: [
      'On the Case Assessment page, select Print Incident Report or Download PDF. In Violation Details, select Download Incident Report PDF.',
      'Print opens the form in a new tab with the print dialog.',
      'Fill in the blanks by hand (time, location, witness details, action taken) and collect the signatures.',
    ],
    tips: ['If nothing opens when you print, allow pop-ups for SARES in your browser, or use Download PDF.'],
  },

  // ---- Reports ----------------------------------------------------------------
  {
    id: 'reports',
    category: 'reports',
    title: 'Filter and export a report',
    summary: 'Review cases by school year, month, grade, level, and status, then export them.',
    link: { to: '/sares/reports', label: 'Open Reports' },
    steps: [
      'Open Reports from the sidebar. It shows the current school year by default.',
      'Narrow the cases with School year, Month, Grade level, Offense level, Status, or the search box.',
      'Check the "Showing:" line under the filters; it states exactly what is included.',
      'Select Export DOCX to save those cases as a Word document with a summary and signature lines.',
    ],
    tips: ['Choose "All school years" only when you need the full history, since it loads every case.'],
  },

  // ---- Rules and school year --------------------------------------------------
  {
    id: 'sanction-rules',
    category: 'rules',
    title: 'Change a sanction in the handbook rules',
    summary: 'Update what is recommended for an offense number.',
    link: { to: '/sares/rules', label: 'Open Rule Management' },
    steps: [
      'Open Rule Management and select the Sanction Rules tab.',
      'Choose the offense level.',
      'Edit the sanction for the offense number. Edited boxes are highlighted until saved.',
      'Select Save Rules, or Discard to undo your edits.',
    ],
    tips: [
      'Counselors can edit the rules for their own school level; the superadmin can edit both.',
      'Changes apply to new cases only. Recorded cases keep their sanction.',
    ],
  },
  {
    id: 'violation-catalog',
    category: 'rules',
    title: 'Add or edit violations in the catalog',
    summary: 'Maintain the offense classes and violations counselors choose from.',
    link: { to: '/sares/rules', label: 'Open Rule Management' },
    superadminOnly: true,
    steps: [
      'Open Rule Management and select the Violation Catalog tab.',
      'Select Add offense class, or Edit on an existing class.',
      'Set the offense type and level, the class name, and its violations. Tick Referral for violations that may involve illegal activity.',
      'Select Apply, then Save Catalog to keep the changes.',
    ],
  },
  {
    id: 'school-year',
    category: 'rules',
    title: 'Set the school year opening day',
    summary: 'Tell SARES when each school year starts, so offense counts restart on the right day.',
    link: { to: '/sares/rules', label: 'Open Rule Management' },
    superadminOnly: true,
    steps: [
      'Open Rule Management and select the School Year tab.',
      'Enter the opening day announced by DepEd or the school.',
      'Select Save Calendar.',
    ],
    tips: ['Set it before classes start. Years left blank start on June 1, and recorded cases keep their school year.'],
  },

  // ---- Administration ---------------------------------------------------------
  {
    id: 'system-logs',
    category: 'admin',
    title: 'Review activity and clean up old logs',
    summary: 'See who did what, and remove logs older than one year.',
    link: { to: '/sares/system-logs', label: 'Open System Logs' },
    superadminOnly: true,
    steps: [
      'Open System Logs from the sidebar.',
      'Choose a date range, school scope, or activity type, then select Apply filters.',
      'To clean up, select Delete logs older than one year under Log retention and confirm.',
    ],
    tips: ['Only entries older than one year can be deleted, and each cleanup is itself logged.'],
  },

  // ---- Troubleshooting ----------------------------------------------------------
  {
    id: 'cannot-submit',
    category: 'troubleshooting',
    title: 'I cannot submit: "Loading the school handbook rules"',
    summary: 'SARES waits for the latest rules so cases are never saved against an old schedule.',
    steps: [
      'Wait a few seconds; the button turns on when the rules have loaded.',
      'If it says the rules could not be loaded, check your internet connection and reload the page.',
    ],
  },
  {
    id: 'offense-changed',
    category: 'troubleshooting',
    title: '"The offense number changed" when submitting',
    summary: 'Someone recorded another case for the same student while you were filling in the form.',
    steps: [
      'Read the message: it shows the old and new offense number.',
      'Check the updated recommended sanction on the review step.',
      'Submit again.',
    ],
  },
  {
    id: 'ai-unavailable',
    category: 'troubleshooting',
    title: 'No recommended offense appears',
    summary: 'The AI may be unavailable, or your description may not match a handbook offense.',
    steps: [
      'Select Try again if it is offered.',
      'Or choose "None of these fit? Browse the handbook" and pick the offense yourself.',
      'If no offense matched, go back and add detail about what was done.',
    ],
  },
  {
    id: 'numbers-differ',
    category: 'troubleshooting',
    title: 'The Dashboard and Reports show different numbers',
    summary: 'They cover different periods.',
    steps: [
      'The Dashboard counts all school years.',
      'Reports counts the school year chosen in its filter (the current one by default).',
      'Set Reports to "All school years" to compare them directly.',
    ],
  },
  {
    id: 'offense-review',
    category: 'troubleshooting',
    title: '"Offense number needs review" on a case',
    summary: "An earlier case changed after this one was recorded, so the student's count no longer matches.",
    steps: [
      'Read the note: it shows the recorded number and the current one.',
      'Decide whether the sanction should be reissued. SARES never changes a recorded sanction on its own.',
    ],
  },
]);

/** Guides visible to this user, optionally filtered by a search term. */
export function filterGuides({ role = '', search = '' } = {}) {
  const terms = String(search).toLowerCase().split(/\s+/).filter(Boolean);
  return GUIDES.filter((guide) => !guide.superadminOnly || role === 'superadmin')
    .filter((guide) => {
      if (terms.length === 0) return true;
      const text = [guide.title, guide.summary, ...(guide.steps || []), ...(guide.tips || []), ...(guide.warnings || [])]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => text.includes(term));
    });
}
