/**
 * Localized Authentication Error Messages
 * Translates technical Supabase Auth errors into user-friendly Roman Urdu & English messages.
 */

export function getLocalizedAuthError(rawError: any, isRomanUrdu: boolean = true): string {
  if (!rawError) return '';

  const message = (typeof rawError === 'string' ? rawError : rawError.message || '').toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid_grant')) {
    return isRomanUrdu
      ? 'Email ya password ghalat hai. Baraye meharbani dobara check karein.'
      : 'Invalid email or password. Please check your credentials and try again.';
  }

  if (message.includes('user already registered') || message.includes('already exists')) {
    return isRomanUrdu
      ? 'Is email se account pehle se mojood hai. Baraye meharbani login karein ya password reset karein.'
      : 'An account with this email already exists. Please log in instead.';
  }

  if (message.includes('password should be at least') || message.includes('weak password')) {
    return isRomanUrdu
      ? 'Password kam az kam 8 characters par mushtamil hona chahiye.'
      : 'Password must be at least 8 characters long.';
  }

  if (message.includes('email not confirmed') || message.includes('unconfirmed')) {
    return isRomanUrdu
      ? 'Email tasdeeq nahi hua. Baraye meharbani apna inbox check karein ya verification link par click karein.'
      : 'Email is not verified yet. Please check your inbox for the confirmation link.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return isRomanUrdu
      ? 'Bohat ziyada koshishein ki gayi hain. Baraye meharbani thori der baad dobara koshish karein.'
      : 'Too many attempts. Please wait a few moments before trying again.';
  }

  if (message.includes('fetch failed') || message.includes('network')) {
    return isRomanUrdu
      ? 'Server ya internet se rabta nahi ho saka. Connection check karein.'
      : 'Unable to connect to the server. Please check your network connection.';
  }

  if (message.includes('access denied') || message.includes('not authorized')) {
    return isRomanUrdu
      ? 'Aapko is portal tak rasai ki ijazat nahi hai.'
      : 'Access denied. You do not have permission to access this area.';
  }

  // Fallback
  return isRomanUrdu
    ? 'Authentication mein rukawat pesh aayi: ' + (rawError.message || 'Dobara koshish karein.')
    : (rawError.message || 'An unexpected error occurred. Please try again.');
}
