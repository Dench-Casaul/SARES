import { collection, doc, runTransaction } from "firebase/firestore";

const OFFENSE_CODES = Object.freeze({ minor: "01", major: "02" });
const MAX_TRANSACTION_VIOLATIONS = 499;

export function formatIncidentCaseNumber(offenseType, recordedAt, recordingOrder) {
  const normalizedType = String(offenseType || "").toLowerCase();
  const offenseCode = Object.hasOwn(OFFENSE_CODES, normalizedType) ? OFFENSE_CODES[normalizedType] : null;
  if (!offenseCode) throw new Error(`Unsupported offense type: ${offenseType}`);
  if (!(recordedAt instanceof Date) || Number.isNaN(recordedAt.getTime())) {
    throw new Error("A valid recording date is required to create a case number.");
  }
  if (!Number.isSafeInteger(recordingOrder) || recordingOrder < 1) {
    throw new Error("A positive recording order is required to create a case number.");
  }

  return `${recordedAt.getFullYear()}-${offenseCode}-${String(recordingOrder).padStart(5, "0")}`;
}

export async function saveViolationsWithCaseNumbers(db, payloads, recordedAt = new Date()) {
  if (!Array.isArray(payloads)) throw new Error("Violation payloads must be an array.");
  if (!(recordedAt instanceof Date) || Number.isNaN(recordedAt.getTime())) {
    throw new Error("A valid recording date is required to create case numbers.");
  }
  if (payloads.length === 0) return [];
  if (payloads.length > MAX_TRANSACTION_VIOLATIONS) {
    throw new Error(`A single incident cannot include more than ${MAX_TRANSACTION_VIOLATIONS} students.`);
  }

  const counterRef = doc(db, "system_counters", "incident-report-sequence");
  const violationRefs = payloads.map(() => doc(collection(db, "violations")));
  const recordedYear = recordedAt.getFullYear();
  let savedViolations = [];

  await runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);
    const lastSequence = counterSnapshot.exists() ? counterSnapshot.data().last_sequence : 0;
    if (!Number.isSafeInteger(lastSequence) || lastSequence < 0) {
      throw new Error("The incident report sequence counter is invalid.");
    }
    if (lastSequence + payloads.length > Number.MAX_SAFE_INTEGER) {
      throw new Error("The incident report sequence has reached its limit.");
    }

    savedViolations = payloads.map((payload, index) => {
      const recordingOrder = lastSequence + index + 1;
      return {
        ...payload,
        case_number: formatIncidentCaseNumber(payload.offense_type, recordedAt, recordingOrder),
        case_recorded_year: recordedYear,
        case_recording_order: recordingOrder,
      };
    });

    savedViolations.forEach((violation, index) => {
      transaction.set(violationRefs[index], violation);
    });
    transaction.set(counterRef, { last_sequence: lastSequence + payloads.length });
  });

  return savedViolations.map((violation, index) => ({
    ...violation,
    id: violationRefs[index].id,
  }));
}
