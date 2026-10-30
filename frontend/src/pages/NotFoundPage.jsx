import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section>
      <h2>Page not found</h2>
      <p className="muted">
        We couldn&apos;t find the page you&apos;re looking for.
      </p>
      <Link to="/">Back to boards</Link>
    </section>
  );
}

export default NotFoundPage;
