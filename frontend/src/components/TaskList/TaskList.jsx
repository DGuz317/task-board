import { useEffect, useRef, useState } from "react";
import TaskRow from "../TaskRow.jsx";
import CreateButton from "../CreateButton.jsx";
import CreateTaskModal from "../CreateTaskModal/index.js";
import { useTasks } from "./useTasks.js";
import "./TaskList.css";

/**
 * TaskRow already renders its own <li>, so rows are placed directly
 * inside the <ul> without an extra wrapping <li>.
 */
function TaskList() {
  const { tasks, addTask } = useTasks();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createButtonRef = useRef(null);
  const wasCreateOpenRef = useRef(false);

  function handleCreated(task) {
    addTask(task);
    setIsCreateOpen(false);
  }

  // TaskForm's title input carries a native autoFocus, which the browser
  // applies before Modal's own effect can record the real opener. That
  // leaves Modal's built-in focus-return pointed at an element that gets
  // unmounted on close, so this is the reliable path back to the trigger.
  useEffect(() => {
    if (wasCreateOpenRef.current && !isCreateOpen) {
      createButtonRef.current?.focus();
    }
    wasCreateOpenRef.current = isCreateOpen;
  }, [isCreateOpen]);

  return (
    <div className="task-list-widget">
      <div className="task-list-header">
        <CreateButton
          ref={createButtonRef}
          onClick={() => setIsCreateOpen(true)}
        />
      </div>
      <TaskListBody tasks={tasks} />
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

function TaskListBody({ tasks }) {
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
