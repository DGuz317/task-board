import { forwardRef } from "react";
import "./CreateButton.css";

/**
 * @typedef {Object} CreateButtonProps
 * @property {() => void} onClick
 */

/** @type {import("react").ForwardRefExoticComponent<CreateButtonProps & import("react").RefAttributes<HTMLButtonElement>>} */
const CreateButton = forwardRef(function CreateButton({ onClick }, ref) {
  return (
    <button type="button" ref={ref} className="create-button" onClick={onClick}>
      Create
    </button>
  );
});

export default CreateButton;
