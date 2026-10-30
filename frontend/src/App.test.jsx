import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  it("renders the placeholder app root instead of the Vite starter page", () => {
    render(<App />);

    expect(screen.getByTestId("app-root")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Task Board" })).toBeInTheDocument();
    expect(screen.queryByText(/vite \+ react/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/count is/i)).not.toBeInTheDocument();
  });
});
