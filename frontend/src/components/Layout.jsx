import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

function Layout() {
  return (
    <div className="container">
      <Header />
      <main id="app-root" data-testid="app-root">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default Layout;
