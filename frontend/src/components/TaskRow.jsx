import "./TaskRow.css";

/**
 * @typedef {Object} TaskRowProps
 * @property {string} title
 * @property {string|null} [description]
 */

/** @param {TaskRowProps} props */
function TaskRow({ title, description }) {
  return (
    <li className="task-row">
      <div className="task-row__text">
        <p className="task-row__title">{title}</p>
        {description ? (
          <p className="task-row__description">{description}</p>
        ) : null}
      </div>
      <div className="task-row__actions" data-testid="task-row-actions" />
    </li>
  );
}

export default TaskRow;
