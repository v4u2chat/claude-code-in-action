import { test, expect, vi, afterEach, beforeEach, describe } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock all context providers and child components to isolate toggle behavior
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFileSystem: vi.fn(),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useChat: vi.fn(),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Panel</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, ...props }: any) => (
    <div data-testid="resizable-group" {...props}>
      {children}
    </div>
  ),
  ResizablePanel: ({ children, ...props }: any) => (
    <div data-testid="resizable-panel" {...props}>
      {children}
    </div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MainContent toggle buttons", () => {
  test("renders both Preview and Code tab triggers", () => {
    render(<MainContent />);

    expect(screen.getByText("Preview")).toBeDefined();
    expect(screen.getByText("Code")).toBeDefined();
  });

  test("shows preview panel by default", () => {
    render(<MainContent />);

    expect(screen.getByTestId("preview-frame")).toBeDefined();
    expect(screen.queryByTestId("file-tree")).toBeNull();
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("clicking Code tab shows code panel (file tree and editor)", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Initially preview is shown
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Click the Code tab using userEvent for realistic interaction
    await user.click(screen.getByText("Code"));

    // Code panel should now be visible
    expect(screen.getByTestId("file-tree")).toBeDefined();
    expect(screen.getByTestId("code-editor")).toBeDefined();

    // Preview should be hidden
    expect(screen.queryByTestId("preview-frame")).toBeNull();
  });

  test("clicking Preview tab after Code tab shows preview panel again", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Switch to Code view
    await user.click(screen.getByText("Code"));
    expect(screen.getByTestId("code-editor")).toBeDefined();

    // Switch back to Preview
    await user.click(screen.getByText("Preview"));

    // Preview panel should be visible
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Code panel should be hidden
    expect(screen.queryByTestId("file-tree")).toBeNull();
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("Preview tab is active by default", () => {
    render(<MainContent />);

    const previewTab = screen.getByText("Preview").closest("[data-slot='tabs-trigger']");
    const codeTab = screen.getByText("Code").closest("[data-slot='tabs-trigger']");

    expect(previewTab?.getAttribute("data-state")).toBe("active");
    expect(codeTab?.getAttribute("data-state")).toBe("inactive");
  });

  test("Code tab becomes active after clicking it", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByText("Code"));

    const previewTab = screen.getByText("Preview").closest("[data-slot='tabs-trigger']");
    const codeTab = screen.getByText("Code").closest("[data-slot='tabs-trigger']");

    expect(codeTab?.getAttribute("data-state")).toBe("active");
    expect(previewTab?.getAttribute("data-state")).toBe("inactive");
  });

  test("toggling between tabs multiple times works correctly", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Start: Preview visible
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Click Code
    await user.click(screen.getByText("Code"));
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.queryByTestId("preview-frame")).toBeNull();

    // Click Preview
    await user.click(screen.getByText("Preview"));
    expect(screen.getByTestId("preview-frame")).toBeDefined();
    expect(screen.queryByTestId("code-editor")).toBeNull();

    // Click Code again
    await user.click(screen.getByText("Code"));
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.queryByTestId("preview-frame")).toBeNull();
  });
});
