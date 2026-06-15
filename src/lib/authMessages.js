const redirectBase = () => {
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return `${window.location.origin}${normalizedBase}`
}

export const authMessages = {
  loginFailed: 'Login failed. Check your email and password, or use Continue with Google if that is how you registered.',
  registrationFailed: 'We could not complete registration right now. Please try again in a moment.',
  registrationCheckEmail: 'If this email can be registered, we’ll send a confirmation link. If you already have an account, please log in or reset your password.',
  forgotPasswordSuccess: 'If an account exists for this email, a password reset link has been sent.',
  forgotPasswordFailed: 'We could not send a reset link right now. Please try again in a moment.',
  resetPasswordFailed: 'We could not update your password. Please try the reset link again or request a new one.',
  changePasswordFailed: 'We could not update your password right now. Please try again in a moment.',
  googleLoginFailed: 'We could not start Google login right now. Please try again in a moment.',
  passwordsDoNotMatch: 'Passwords must match.',
  passwordRequired: 'Please enter a new password.',
  passwordUpdateSuccess: 'Your password has been updated.',
  loginRequiredForPasswordUpdate: 'Please use the password reset link from your email to update your password.'
}

export function getAuthRedirectUrl(path = '') {
  const baseUrl = redirectBase()
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${baseUrl}${normalizedPath}`
}

export function logAuthError(context, error) {
  if (error) {
    console.error(`[auth] ${context}`, error)
  }
}
