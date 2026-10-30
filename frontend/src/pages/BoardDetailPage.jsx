import { useParams } from "react-router-dom";

function BoardDetailPage() {
  const { id } = useParams();

  return (
    <section>
      <h2>Board {id}</h2>
      <p data-testid="board-id" className="muted">
        Board details for board {id} will appear here.
      </p>
    </section>
  );
}

export default BoardDetailPage;
