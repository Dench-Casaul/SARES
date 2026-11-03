import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, X } from "lucide-react";
import { useAuthProfile } from "./authContext";
import "./css/HelpAssistant.css";

const TOURS = {
  "/sares/dashboard": [
    {
      target: '[data-help-target="dashboard-welcome"]',
      title: "Your dashboard",
      content: "Start here for the current overview. Log New Violation takes you directly to the incident-report workflow.",
    },
    {
      target: '[data-help-target="dashboard-stats"]',
      title: "Read the dashboard totals",
      content: "These cards summarize recorded violations, students needing attention, and the student count in your permitted school scope.",
    },
    {
      target: '[data-help-target="dashboard-charts"]',
      title: "Spot patterns",
      content: "These charts show monthly volume, category distribution, and common violations. They summarize records; open the student or case record for details.",
    },
    {
      target: '[data-help-target="dashboard-activity"]',
      title: "Recent activity and pending cases",
      content: "Review the latest recorded violations and students with pending cases. Use these summaries to decide what needs follow-up.",
    },
    {
      target: '[data-help-target="dashboard-navigation"]',
      title: "Move around SARES",
      content: "Use the navigation to manage students, review handbook rules, record violations, view reports, and change account security settings. System Logs is available to superadmins.",
    },
  ],
  "/sares/students": [
    {
      target: '[data-help-target="student-tabs"]',
      title: "Students and Trash",
      content: "Students shows active records. Trash contains archived profiles and offers restore or permanent-delete actions.",
    },
    {
      target: '[data-help-target="student-list"]',
      title: "Search and filter",
      content: "Search by name or student ID and filter by year level. The table shows identity, section, violation count, status, and available actions.",
    },
    {
      target: '[data-help-target="student-table"]',
      title: "Open a student record",
      content: "Select an active student row to view profile details and disciplinary history. Use the row actions to edit a profile or move it to Trash.",
    },
    {
      target: '[data-help-target="add-student"]',
      title: "Add a student",
      content: "Use Add Student to create a profile. Check identifying details and enter only information needed for school records.",
    },
    {
      target: '[data-help-target="student-tabs"]',
      title: "Open Trash",
      content: "Next, the walkthrough opens Trash so you can see how archived profiles are reviewed.",
      activate: '[data-help-control="student-trash-tab"]',
    },
    {
      target: '[data-help-target="student-trash-panel"]',
      title: "Restore or permanently delete",
      content: "Restore returns a profile to the active student list. Permanent deletion cannot be undone, so verify the record and retention requirements before using it.",
    },
  ],
  "/sares/violation": [
    {
      target: '[data-help-step="0"]',
      title: "Step 1: Student and date",
      content: "Search for and select every student involved, then enter the date the incident happened.",
    },
    {
      target: '[data-help-target="violation-student-fields"]',
      title: "Identify the student and date",
      content: "Confirm the selected student's name and ID. Add multiple students when they were involved in the same incident.",
    },
    {
      target: '[data-help-target="violation-incident-date"]',
      title: "Enter the incident date",
      content: "Use the date the incident occurred, not the date you are entering the report.",
    },
    {
      target: '[data-help-step="1"]',
      title: "Step 2: Offense type",
      content: "Choose Minor or Major using the handbook classification. Minor offenses use repeat-offense counts; major offenses use a severity score.",
    },
    {
      target: '[data-help-step="2"]',
      title: "Step 3: Subcategory",
      content: "Choose the severity band within the offense type: Light or Less Serious for minor; Serious or Very Serious for major.",
    },
    {
      target: '[data-help-step="3"]',
      title: "Step 4: Specific violation",
      content: "Expand the matching offense group and select the specific act. Check its wording and any authority-referral warning before continuing.",
    },
    {
      target: '[data-help-step="4"]',
      title: "Step 5: Incident report",
      content: "Enter who reported the incident and their role. Description, witnesses, and parent/guardian notes may be added when relevant. AI assistance is optional; do not send confidential or identifying details in its narrative.",
    },
    {
      target: '[data-help-step="5"]',
      title: "Step 6: Review and submit",
      content: "Verify student, date, classification, violation, handling path, and recommendation. Submitting saves the case; mediation routes it for counselor review.",
    },
  ],
  "/sares/case-assessment": [
    {
      target: '[data-help-target="assessment-summary"]',
      title: "Review the case",
      content: "Confirm the incident details and handbook-based assessment, including the selected offense and recommendation. This page may open without a case if accessed directly.",
    },
    {
      target: '[data-help-target="assessment-actions"]',
      title: "Print or download",
      content: "Print or download the incident report for authorized school use. Store or share copies according to student-record privacy requirements.",
    },
    {
      target: '[data-help-target="assessment-record"]',
      title: "Confirm student identity",
      content: "Check the student name, student number, and year level against the source report.",
    },
    {
      target: '[data-help-target="assessment-violation"]',
      title: "Confirm violation details",
      content: "Check the incident date, offense classification, specific violation, reporter, and current case status.",
    },
    {
      target: '[data-help-target="assessment-sanction"]',
      title: "Understand the assessment",
      content: "Review the offense count or severity score and the recommended and identified sanctions. For mediation cases, the handbook sanction may be retained as an escalation option.",
    },
    {
      target: '[data-help-target="assessment-description"]',
      title: "Review the narrative",
      content: "Read the incident description and any additional details before sharing or filing the report.",
    },
  ],
  "/sares/rules": [
    {
      target: '[data-help-target="rule-tabs"]',
      title: "Three management panels",
      content: "Handbook is for browsing and filtering. Update Rules edits sanction schedules. Update Violations maintains offense classes and their specific entries.",
    },
    {
      target: '[data-help-target="rule-filters"]',
      title: "Find handbook entries",
      content: "Search by violation or category, then filter by offense type, severity, and category. Apply the filters to update the matching groups.",
    },
    {
      target: '[data-help-target="rule-groups"]',
      title: "Expand an offense group",
      content: "Open a group to see its specific violations and sanction columns. The displayed schedule depends on whether the group is minor or major.",
    },
    {
      target: '[data-help-target="rule-tabs"]',
      title: "Open Update Rules",
      content: "The walkthrough switches to the sanction rules panel.",
      activate: '[data-help-control="rule-tab-rules"]',
    },
    {
      target: '[data-help-target="rule-sanction-schedule"]',
      title: "Minor offense schedule",
      content: "This schedule maps repeat offense numbers to recommended sanctions. Saved values apply to new recommendations; they do not rewrite existing case records.",
    },
    {
      target: '[data-help-target="rule-severity-map"]',
      title: "Major offense severity map",
      content: "These ranges map a severity score to a sanction recommendation. Keep the ranges consistent with approved handbook policy.",
    },
    {
      target: '[data-help-target="rule-save-rules"]',
      title: "Save sanction rules",
      content: "Review all edited values before saving. Changes affect future recommendations, not cases already recorded.",
    },
    {
      target: '[data-help-target="rule-tabs"]',
      title: "Open Update Violations",
      content: "The walkthrough switches to the violation catalog panel.",
      activate: '[data-help-control="rule-tab-violations"]',
    },
    {
      target: '[data-help-target="rule-class-toolbar"]',
      title: "Manage offense classes",
      content: "An offense class groups related handbook violations under a type and severity. Use the add control to create a class or edit an existing class to maintain it.",
    },
    {
      target: '[data-help-target="rule-violation-catalog"]',
      title: "Review specific violations",
      content: "Check each class and its listed violations. Editing a class lets you add or remove entries and mark cases that may require authority referral.",
    },
    {
      target: '[data-help-target="rule-save-catalog"]',
      title: "Save the catalog",
      content: "Save catalog changes after reviewing offense type, severity, class names, and specific violations. These entries feed the violation-recording workflow.",
    },
  ],
  "/sares/reports": [
    {
      target: '[data-help-target="report-filters"]',
      title: "Filter your report",
      content: "Narrow the report by date, grade or section, and offense category. You can also export the filtered report.",
    },
    {
      target: '[data-help-target="report-summary"]',
      title: "Read the summary",
      content: "Total Violations counts matching reports, Unique Students counts students represented, Most Common Offense highlights the leading entry, and Pending Cases shows cases still awaiting action.",
    },
    {
      target: '[data-help-target="report-log"]',
      title: "Review the violation log",
      content: "The log lists the individual records that match your selected filters.",
    },
  ],
  "/sares/account": [
    {
      target: '[data-help-target="account-current-password"]',
      title: "Confirm your current password",
      content: "Enter the password you currently use to sign in. This confirms your identity before a password change.",
    },
    {
      target: '[data-help-target="account-new-password"]',
      title: "Choose a new password",
      content: "Use at least 12 characters and choose a password not used on another service. Re-enter it in the confirmation field.",
    },
    {
      target: '[data-help-target="account-password-submit"]',
      title: "Save the password change",
      content: "Submit the form and wait for the confirmation. If the current password is rejected, check it and retry; if the session has expired, sign in again.",
    },
  ],
  "/sares/system-logs": [
    {
      target: '[data-help-target="system-log-filter"]',
      title: "Filter activity",
      content: "Choose All scopes, Elementary, or High school to narrow the recent activity shown. This filter is available to superadmins.",
    },
    {
      target: '[data-help-target="system-log-list"]',
      title: "Review system activity",
      content: "Review successful sign-ins and in-app actions with their time, account, school, and activity. Treat these records as sensitive administrative information.",
    },
  ],
};

const DEFAULT_POSITION = { x: null, y: null };
const POSITION_KEY = "sares-help-button-position";
const BUTTON_SIZE = 54;
const VIEWPORT_MARGIN = 12;

function readSavedPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    return Number.isFinite(saved?.x) && Number.isFinite(saved?.y)
      ? clampPosition({ x: saved.x, y: saved.y })
      : DEFAULT_POSITION;
  } catch (error) {
    console.error("Could not restore the help button position:", error);
    return DEFAULT_POSITION;
  }
}

function clampPosition(position) {
  return {
    x: Math.min(Math.max(position.x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - BUTTON_SIZE - VIEWPORT_MARGIN)),
    y: Math.min(Math.max(position.y, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerHeight - BUTTON_SIZE - VIEWPORT_MARGIN)),
  };
}

function findTour(pathname, role) {
  const route = pathname.match(/^\/(?:sares\/)?case-assessment(?:\/[^/]+)?$/)
    ? "/sares/case-assessment"
    : pathname.replace(/\/$/, "");
  const routeAliases = {
    "/dashboard": "/sares/dashboard",
    "/students": "/sares/students",
    "/violation": "/sares/violation",
    "/rules": "/sares/rules",
    "/reports": "/sares/reports",
    "/account": "/sares/account",
    "/system-logs": "/sares/system-logs",
  };
  const normalizedRoute = routeAliases[route] || route;
  const steps = TOURS[normalizedRoute];

  if (normalizedRoute === "/sares/system-logs" && role !== "superadmin") return [];
  return steps || [];
}

export default function HelpAssistant() {
  const { userProfile } = useAuthProfile();
  const { pathname, key: locationKey } = useLocation();
  const [position, setPosition] = useState(readSavedPosition);
  const [tourSessionKey, setTourSessionKey] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [popoverStyle, setPopoverStyle] = useState({});
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const steps = findTour(pathname, userProfile?.role);
  const currentTourSessionKey = `${locationKey}:${pathname}:${userProfile?.user_id || userProfile?.email || ""}`;
  const active = tourSessionKey === currentTourSessionKey;
  const step = active ? steps[stepIndex] : null;
  const isAuthenticatedPage = Boolean(userProfile)
    && (pathname === "/sares" || pathname.startsWith("/sares/") || [
      "/dashboard", "/students", "/violation", "/case-assessment", "/rules",
      "/reports", "/account", "/system-logs",
    ].some((route) => pathname === route || pathname.startsWith(`${route}/`)));

  const updateCoachmarkPosition = useCallback(() => {
    if (!step) return;
    const target = document.querySelector(step.target);
    if (!target) {
      setTargetRect(null);
      setPopoverStyle({});
      return;
    }

    const rect = target.getBoundingClientRect();
    setTargetRect({
      sessionKey: currentTourSessionKey,
      stepIndex,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
    const popoverWidth = Math.min(340, window.innerWidth - 32);
    const popoverHeight = popoverRef.current?.offsetHeight || 210;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - popoverWidth / 2, 16),
      window.innerWidth - popoverWidth - 16
    );
    const below = rect.bottom + popoverHeight + 16 <= window.innerHeight;
    const top = below
      ? rect.bottom + 12
      : Math.max(16, rect.top - popoverHeight - 12);

    setPopoverStyle({ left, top, width: popoverWidth });
  }, [currentTourSessionKey, step, stepIndex]);

  useEffect(() => {
    if (!active) return undefined;
    const target = step ? document.querySelector(step.target) : null;
    if (step && !target) {
      const frame = window.requestAnimationFrame(() => {
        if (stepIndex < steps.length - 1) {
          setStepIndex((index) => index + 1);
        } else {
          setTourSessionKey(null);
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }

    target?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    const frame = window.requestAnimationFrame(updateCoachmarkPosition);
    window.addEventListener("resize", updateCoachmarkPosition);
    window.addEventListener("scroll", updateCoachmarkPosition, true);
    const onKeyDown = (event) => {
      if (event.key === "Escape") setTourSessionKey(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateCoachmarkPosition);
      window.removeEventListener("scroll", updateCoachmarkPosition, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, step, stepIndex, steps.length, updateCoachmarkPosition]);

  useEffect(() => {
    if (!active) return undefined;
    popoverRef.current?.focus();
    const button = buttonRef.current;
    return () => button?.focus();
  }, [active]);

  useEffect(() => {
    if (position.x === null || position.y === null) return;
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch (error) {
      console.error("Could not save the help button position:", error);
    }
  }, [position]);

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => current.x === null ? current : clampPosition(current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!isAuthenticatedPage) return null;

  const startTour = () => {
    setStepIndex(0);
    setTourSessionKey(currentTourSessionKey);
  };

  const goToStep = (nextIndex) => {
    const nextStep = steps[nextIndex];
    if (!nextStep) return;
    if (nextStep.activate) {
      document.querySelector(nextStep.activate)?.click();
    }
    setStepIndex(nextIndex);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, x: event.clientX, y: event.clientY };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - dragRef.current.x) + Math.abs(event.clientY - dragRef.current.y) > 5) {
      movedRef.current = true;
    }
    if (!movedRef.current) return;
    setPosition(clampPosition({
      x: event.clientX - dragRef.current.offsetX,
      y: event.clientY - dragRef.current.offsetY,
    }));
  };

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleKeyDown = (event) => {
    const movement = event.shiftKey ? 32 : 12;
    const offsets = {
      ArrowUp: { x: 0, y: -movement },
      ArrowDown: { x: 0, y: movement },
      ArrowLeft: { x: -movement, y: 0 },
      ArrowRight: { x: movement, y: 0 },
    };
    if (!offsets[event.key]) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(clampPosition({
      x: (position.x ?? rect.left) + offsets[event.key].x,
      y: (position.y ?? rect.top) + offsets[event.key].y,
    }));
  };

  const hasTarget = Boolean(
    step
      && targetRect?.sessionKey === currentTourSessionKey
      && targetRect?.stepIndex === stepIndex
  );
  const showTourContent = active && (hasTarget || steps.length === 0);

  return (
    <>
      {showTourContent && (
        <>
          <svg
            className="help-tour-backdrop"
            aria-hidden="true"
            viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <mask id="help-tour-cutout">
                <rect width="100%" height="100%" fill="white" />
                {hasTarget && (
                  <rect
                    x={targetRect.left - 5}
                    y={targetRect.top - 5}
                    width={targetRect.width + 10}
                    height={targetRect.height + 10}
                    rx="10"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(3, 10, 25, 0.30)" mask="url(#help-tour-cutout)" />
            {hasTarget && (
              <rect
                x={targetRect.left - 5}
                y={targetRect.top - 5}
                width={targetRect.width + 10}
                height={targetRect.height + 10}
                rx="10"
                fill="none"
                stroke="#77b7ff"
                strokeWidth="2"
              />
            )}
          </svg>
          <section
            className="help-tour-popover"
            role="dialog"
            aria-label="SARES walkthrough"
            tabIndex={-1}
            ref={popoverRef}
            style={popoverStyle}
          >
            <div className="help-tour-heading">
              <span>{step ? step.title : "No walkthrough yet"}</span>
              <button type="button" className="help-tour-close" onClick={() => setTourSessionKey(null)} aria-label="Exit walkthrough">
                <X size={18} />
              </button>
            </div>
            <p>{step ? step.content : "There is no walkthrough available for this page yet. You can still use the ? button whenever you need help."}</p>
            <div className="help-tour-footer">
              <span>{steps.length ? `${stepIndex + 1} of ${steps.length}` : "SARES help"}</span>
              <div>
                {stepIndex > 0 && (
                  <button type="button" className="help-tour-secondary" onClick={() => goToStep(stepIndex - 1)}>
                    Back
                  </button>
                )}
                {stepIndex < steps.length - 1 ? (
                  <button type="button" className="help-tour-primary" onClick={() => goToStep(stepIndex + 1)}>
                    Next
                  </button>
                ) : (
                  <button type="button" className="help-tour-primary" onClick={() => setTourSessionKey(null)}>
                    {steps.length ? "Done" : "Close"}
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      )}
      <button
        type="button"
        className={`help-assistant-button${active ? " help-assistant-button--active" : ""}`}
        style={position.x === null ? undefined : { left: position.x, top: position.y }}
        aria-label="Open walkthrough for this page. Use arrow keys to move this button."
        title="Drag to move · click for help · arrow keys to reposition"
        onClick={() => {
          if (movedRef.current) {
            movedRef.current = false;
            return;
          }
          startTour();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        ref={buttonRef}
      >
        <HelpCircle size={27} strokeWidth={2.2} />
      </button>
    </>
  );
}
