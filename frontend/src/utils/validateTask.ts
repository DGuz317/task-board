export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

export interface TaskInput {
  title?: string;
  description?: string;
}

export interface TaskErrors {
  title?: string;
  description?: string;
}

export interface ValidationResult {
  values: { title: string; description: string };
  errors: TaskErrors;
  isValid: boolean;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateTask(input: TaskInput): ValidationResult {
  const title = toTrimmedString(input.title);
  const description = toTrimmedString(input.description);
  const errors: TaskErrors = {};

  if (title.length === 0) {
    errors.title = "Title is required";
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
  }

  if (description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer`;
  }

  return {
    values: { title, description },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
