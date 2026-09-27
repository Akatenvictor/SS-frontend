/**
 * Validates that a funding deadline (in YYYY-MM-DD format) is at least 24 hours in the future.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Error message if invalid, undefined if valid
 */
export function validateDeadline(dateString: string): string | undefined {
  if (!dateString) {
    return "Funding deadline is required";
  }

  // Parse the date string (YYYY-MM-DD format from HTML date input)
  const deadlineDate = new Date(dateString);

  // Check if the date is valid
  if (isNaN(deadlineDate.getTime())) {
    return "Invalid date format";
  }

  // Set time to end of day (23:59:59) for the deadline
  deadlineDate.setHours(23, 59, 59, 999);

  // Get current time
  const now = new Date();

  // Calculate milliseconds in 24 hours
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  // Calculate the minimum allowed deadline (24 hours from now)
  const minimumDeadline = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  // Check if deadline is at least 24 hours in the future
  if (deadlineDate.getTime() < minimumDeadline.getTime()) {
    return "Deadline must be at least 24 hours from now";
  }

  return undefined;
}
