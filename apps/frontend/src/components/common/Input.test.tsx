import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders without label", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });

  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders required indicator when required", () => {
    render(<Input label="Email" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
  });

  it("sets aria-invalid when error is present", () => {
    render(<Input error="Required" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("accepts user input", async () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "John");
    expect(input).toHaveValue("John");
  });

  it("displays helper text when no error", () => {
    render(<Input helperText="Enter your email address" />);
    expect(screen.getByText("Enter your email address")).toBeInTheDocument();
  });

  it("hides helper text when error is shown", () => {
    render(<Input helperText="Helper" error="Error" />);
    expect(screen.queryByText("Helper")).not.toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });
});
