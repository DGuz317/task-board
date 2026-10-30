import TaskRow from "../TaskRow.jsx";
import { useTasks } from "./useTasks.js";
import "./TaskList.css";

/**
 * TaskRow already renders its own <li>, so rows are placed directly
 * inside the <ul> without an extra wrapping <li>.
 */
function TaskList() {
  const { tasks } = useTasks();

  if (tasks === null) {
    return null;
  }

  if (tasks.length === 0) {
    return (
      <p className="task-list-empty muted">
        No tasks yet. Click Create to add one.
      </p>
    );
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          title={task.title}
          description={task.description}
        />
      ))}
    </ul>
  );
}

export default TaskList;
