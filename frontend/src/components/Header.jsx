import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="app-header">
      <h1>Task Board</h1>
      <nav aria-label="Primary">
        <Link to="/">Boards</Link>
      </nav>
    </header>
  );
}

export default Header;
