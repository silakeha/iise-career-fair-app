// Organizer emails stored in environment variable
// Set REACT_APP_ORGANIZER_EMAILS in your .env file (comma-separated list)

/**
 * Gets organizer emails from environment variable
 */
function getOrganizerEmails() {
  const envEmails = process.env.REACT_APP_ORGANIZER_EMAILS || '';
  if (!envEmails.trim()) {
    return [];
  }
  // Split by comma and trim whitespace
  return envEmails.split(',').map(email => email.trim()).filter(email => email.length > 0);
}

/**
 * Checks if an email is an organizer email
 * Synchronous - reads from environment variable
 */
export function isOrganizerEmail(email) {
  const emails = getOrganizerEmails();
  return emails.map(e => e.toLowerCase()).includes(email.toLowerCase());
}
