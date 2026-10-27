// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const { createPitchMock, toastMock, pushMock } = vi.hoisted(() => ({
  createPitchMock: vi.fn(),
  toastMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/action", () => ({ createPitch: createPitchMock }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@uiw/react-md-editor", async () => {
  const { default: MDEditorMock } = await import("./mocks/md-editor");

  return { default: MDEditorMock };
});

import StartupForm from "@/components/StartupForm";

const fillForm = () => {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Acme AI" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: {
      value: "A startup that helps small teams automate repetitive work.",
    },
  });
  fireEvent.change(screen.getByLabelText("Category"), {
    target: { value: "Productivity" },
  });
  fireEvent.change(screen.getByLabelText("Image URL"), {
    target: { value: "https://images.unsplash.com/photo-123" },
  });
  fireEvent.change(screen.getByLabelText("Pitch"), {
    target: {
      value: "## The problem\n\nSmall teams spend too much time on busywork.",
    },
  });
};

const submit = () => {
  const form = screen
    .getByRole("button", { name: /submit/i })
    .closest("form");

  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
};

beforeEach(() => {
  createPitchMock.mockReset();
  toastMock.mockReset();
  pushMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("StartupForm", () => {
  it("redirects to the new startup and shows a success toast", async () => {
    createPitchMock.mockResolvedValue({
      _id: "startup-1",
      error: "",
      status: "SUCCESS",
    });

    render(<StartupForm />);
    fillForm();
    submit();

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/startup/startup-1")
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success" })
    );
  });

  it("renders server field errors", async () => {
    createPitchMock.mockResolvedValue({
      error: "Please check your inputs and try again.",
      status: "ERROR",
      fieldErrors: {
        title: ["Title is too short"],
        link: ["Enter a valid HTTP(S) image URL."],
      },
    });

    render(<StartupForm />);
    fillForm();
    submit();

    expect(await screen.findByText("Title is too short")).toBeTruthy();
    expect(
      screen.getByText("Enter a valid HTTP(S) image URL.")
    ).toBeTruthy();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" })
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic server error without field errors", async () => {
    createPitchMock.mockResolvedValue({
      error: "Could not create your startup. Please try again.",
      status: "ERROR",
    });

    render(<StartupForm />);
    fillForm();
    submit();

    expect(
      await screen.findByText(
        "Could not create your startup. Please try again."
      )
    ).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
