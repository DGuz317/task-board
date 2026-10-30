import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <p className="muted">
            An unexpected error occurred while rendering this page.
          </p>
          <button type="button" onClick={this.handleTryAgain}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
