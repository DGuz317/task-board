import { useId, useRef, useState } from "react";
import { validateTask, normalizeTask } from "../../utils/taskValidation.js";
import "./TaskForm.css";

/**
 * @typedef {Object} TaskFormProps
 * @property {{title?: string, description?: string}} [initialValues]
 * @property {(values: {title: string, description: string}) => void} onSubmit
 * @property {() => void} onCancel
 * @property {string} [submitLabel]
 * @property {boolean} [disabled]
 */

/** @param {TaskFormProps} props */
function TaskForm({
  initialValues = { title: "", description: "" },
  onSubmit,
  onCancel,
  submitLabel = "Create",
  disabled = false,
}) {
  const [values, setValues] = useState(() => ({
    title: initialValues.title ?? "",
    description: initialValues.description ?? "",
  }));
  const [errors, setErrors] = useState({});
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const titleErrorId = useId();
  const descriptionErrorId = useId();

  function handleChange(field) {
    return (event) => {
      const { value } = event.target;
      setValues((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateTask(values);
    setErrors(nextErrors);

    if (nextErrors.title) {
      titleInputRef.current?.focus();
      return;
    }
    if (nextErrors.description) {
      descriptionInputRef.current?.focus();
      return;
    }

    onSubmit(normalizeTask(values));
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      <div className="task-form__field">
        <label className="task-form__label" htmlFor={`${titleErrorId}-input`}>
          Title
        </label>
        <input
          id={`${titleErrorId}-input`}
          ref={titleInputRef}
          className="task-form__input"
          type="text"
          autoFocus
          value={values.title}
          onChange={handleChange("title")}
          aria-invalid={errors.title ? "true" : undefined}
          aria-describedby={errors.title ? titleErrorId : undefined}
          disabled={disabled}
        />
        <div aria-live="polite" className="task-form__error-region">
          {errors.title ? (
            <p id={titleErrorId} className="task-form__error">
              {errors.title}
            </p>
          ) : null}
        </div>
      </div>

      <div className="task-form__field">
        <label
          className="task-form__label"
          htmlFor={`${descriptionErrorId}-input`}
        >
          Description
        </label>
        <textarea
          id={`${descriptionErrorId}-input`}
          ref={descriptionInputRef}
          className="task-form__textarea"
          value={values.description}
          onChange={handleChange("description")}
          aria-invalid={errors.description ? "true" : undefined}
          aria-describedby={errors.description ? descriptionErrorId : undefined}
          disabled={disabled}
        />
        <div aria-live="polite" className="task-form__error-region">
          {errors.description ? (
            <p id={descriptionErrorId} className="task-form__error">
              {errors.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="task-form__actions">
        <button
          type="button"
          className="task-form__button task-form__button--secondary"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="task-form__button task-form__button--primary"
          disabled={disabled}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default TaskForm;
