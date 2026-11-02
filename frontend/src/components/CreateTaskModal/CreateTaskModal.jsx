import { useEffect, useRef, useState } from "react";
import Modal from "../Modal/Modal.jsx";
import TaskForm from "../TaskForm/TaskForm.jsx";
import { createTask } from "../../api/tasks.js";
import "./CreateTaskModal.css";

/**
 * @typedef {Object} CreateTaskModalProps
 * @property {boolean} isOpen
 * @property {() => void} onClose
 * @property {(task: import("../../api/tasks.js").Task) => void} onCreated
 */

/** @param {CreateTaskModalProps} props */
function CreateTaskModal({ isOpen, onClose, onCreated }) {
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setSubmitError(null);
    setPending(false);
    pendingRef.current = false;
  }, [isOpen]);

  async function handleSubmit(values) {
    const title = values.title.trim();
    const description = values.description.trim();

    if (pendingRef.current || !title) {
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setSubmitError(null);

    try {
      const task = await createTask({ title, description });
      onCreated(task);
      onClose();
    } catch {
      if (mountedRef.current) {
        setSubmitError("Could not create the task. Please try again.");
      }
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) {
        setPending(false);
      }
    }
  }

  return (
    <Modal open={isOpen} title="Create task" onClose={onClose}>
      {submitError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="create-task-modal__error"
        >
          {submitError}
        </div>
      ) : null}
      <TaskForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel="Create"
        disabled={pending}
      />
    </Modal>
  );
}

export default CreateTaskModal;
