import TaskList from "../components/TaskList/index.js";

function BoardListPage() {
  return (
    <section>
      <h2>Boards</h2>
      <div className="task-list-region" data-testid="task-list-region">
        <TaskList />
      </div>
    </section>
  );
}

export default BoardListPage;
