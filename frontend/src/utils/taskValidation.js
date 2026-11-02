export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateTask({ title, description } = {}) {
  const trimmedTitle = toTrimmedString(title);
  const errors = {};

  if (trimmedTitle.length === 0) {
    errors.title = "Title is required";
  } else if (trimmedTitle.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
  }

  if (typeof description === "string" && description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer`;
  }

  return errors;
}

export function normalizeTask({ title, description } = {}) {
  return {
    title: toTrimmedString(title),
    description: typeof description === "string" ? description : "",
  };
}
