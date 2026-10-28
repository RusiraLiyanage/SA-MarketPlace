// The same rule the backend enforces on register, reset and change password.
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$&+,:;=?@#|'<>.^*()%_!-])[A-Za-z\d@$&+,:_;=?@#|'<>.^*()%!-]{8,}$/

export const PASSWORD_HINT =
  'At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.'
