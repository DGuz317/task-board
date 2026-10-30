import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

function renderApp(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renders the header and board list placeholder at / inside the 1100px container", () => {
    renderApp("/");

    expect(
      screen.getByRole("heading", { name: "Task Board" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Boards" })).toBeInTheDocument();
    expect(screen.queryByText(/vite \+ react/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/count is/i)).not.toBeInTheDocument();

    const container = screen.getByTestId("app-root").closest(".container");
    expect(container).not.toBeNull();
  });

  it("shows the board detail view with the id from the URL at /boards/42", () => {
    renderApp("/boards/42");

    expect(
      screen.getByRole("heading", { name: /board 42/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("board-id")).toHaveTextContent("42");
  });

  it("shows a not-found message with a link that navigates back to / for an unknown path", async () => {
    const user = userEvent.setup();
    renderApp("/some/unknown/path");

    expect(
      screen.getByRole("heading", { name: /not found/i }),
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /back to boards/i });
    expect(backLink).toHaveAttribute("href", "/");

    await user.click(backLink);

    expect(screen.getByRole("heading", { name: "Boards" })).toBeInTheDocument();
  });
});
