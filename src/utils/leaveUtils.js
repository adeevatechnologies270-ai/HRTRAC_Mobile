// Mobile copy of the web leaveUtils logic.
// Paid leave unlocks 3 months after joining, Earn leave after 1 year.
// If your web utils/leaveUtils.js differs, copy its rules here so both match.

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

export const isPaidLeaveEligible = (joining) =>
  !!joining && new Date() >= addMonths(joining, 3);

export const isHonourLeaveEligible = (joining) =>
  !!joining && new Date() >= addMonths(joining, 12);

export const daysUntilEligible = (joining) => {
  if (!joining) return 0;
  const diff = Math.ceil((addMonths(joining, 3) - new Date()) / 86400000);
  return Math.max(diff, 0);
};

export const getPaidLeaveUnlockDate = (joining) =>
  joining
    ? addMonths(joining, 3).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';