import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./TaskActionsMenu.css";

const ITEM_COUNT = 2;

/**
 * @typedef {Object} TaskActionsMenuProps
 * @property {() => void} onEdit
 * @property {() => void} onDelete
 */

/** @param {TaskActionsMenuProps} props */
function TaskActionsMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const editItemRef = useRef(null);
  const deleteItemRef = useRef(null);
  const itemRefs = [editItemRef, deleteItemRef];

  const closeMenu = useCallback((returnFocus) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (open) {
      editItemRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleDocumentMouseDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [open]);

  function handleTriggerClick() {
    setOpen((prev) => !prev);
  }

  function handleMenuKeyDown(event) {
    const currentIndex = itemRefs.findIndex(
      (ref) => ref.current === document.activeElement,
    );

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const nextIndex = (currentIndex + 1 + ITEM_COUNT) % ITEM_COUNT;
        itemRefs[nextIndex].current?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const nextIndex = (currentIndex - 1 + ITEM_COUNT) % ITEM_COUNT;
        itemRefs[nextIndex].current?.focus();
        break;
      }
      case "Home":
        event.preventDefault();
        editItemRef.current?.focus();
        break;
      case "End":
        event.preventDefault();
        deleteItemRef.current?.focus();
        break;
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  function handleEdit() {
    closeMenu(true);
    onEdit?.();
  }

  function handleDelete() {
    closeMenu(true);
    onDelete?.();
  }

  return (
    <div className="task-actions-menu" ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className="task-actions-menu__trigger"
        aria-label="Task actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={handleTriggerClick}
      >
        <svg
          className="task-actions-menu__icon"
          viewBox="0 0 20 20"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="task-actions-menu__list"
          onKeyDown={handleMenuKeyDown}
        >
          <li role="none">
            <button
              type="button"
              ref={editItemRef}
              role="menuitem"
              tabIndex={-1}
              className="task-actions-menu__item"
              onClick={handleEdit}
            >
              Edit
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              ref={deleteItemRef}
              role="menuitem"
              tabIndex={-1}
              className="task-actions-menu__item task-actions-menu__item--danger"
              onClick={handleDelete}
            >
              Delete
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export default TaskActionsMenu;
