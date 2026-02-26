// Password validation regex - must match backend requirements
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~])[^\s]{8,64}$/;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required.";
  if (!PASSWORD_REGEX.test(password)) {
    return (
      "Password must be 8-64 characters and include at least one uppercase letter, " +
      "one lowercase letter, one number, and one special character (!@#$%^&* etc.). " +
      "Spaces are not allowed."
    );
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) return "Name is required.";
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters long.";
  }
  if (name.trim().length > 100) {
    return "Name must be less than 100 characters.";
  }
  return null;
};

export const validateTenantSlug = (tenantSlug: string): string | null => {
  if (!tenantSlug) return "Organization ID is required.";
  if (tenantSlug.trim().length < 2) {
    return "Organization ID must be at least 2 characters long.";
  }
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
};

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  tenantSlug: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export const validateSignupForm = (data: SignupFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  const nameError = validateName(data.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  const confirmPasswordError = validateConfirmPassword(data.password, data.confirmPassword);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  const tenantSlugError = validateTenantSlug(data.tenantSlug);
  if (tenantSlugError) errors.tenantSlug = tenantSlugError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateLoginForm = (data: LoginFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  if (!data.password) errors.password = "Password is required.";

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
