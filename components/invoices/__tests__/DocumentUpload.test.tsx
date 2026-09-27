import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentUpload } from "../DocumentUpload";

function createFile(name: string, type: string, size: number) {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

function createPdfFile(size: number) {
  return createFile("document.pdf", "application/pdf", size);
}

function createPngFile(size: number) {
  return createFile("image.png", "image/png", size);
}

function uploadFile(input: HTMLInputElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

describe("DocumentUpload", () => {
  it("calls onUpload for a valid PDF under 10 MB", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    const file = createPdfFile(1024);
    const input = screen.getByLabelText("Upload Document") as HTMLInputElement;
    uploadFile(input, file);

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("shows error for PNG file and does not call onUpload", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    const file = createPngFile(1024);
    const input = screen.getByLabelText("Upload Document") as HTMLInputElement;
    uploadFile(input, file);

    expect(screen.getByText("Only PDF files are accepted")).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("shows error for PDF over 10 MB and does not call onUpload", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    const file = createPdfFile(11 * 1024 * 1024);
    const input = screen.getByLabelText("Upload Document") as HTMLInputElement;
    uploadFile(input, file);

    expect(screen.getByText("File must be under 10 MB")).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("shows error for empty file and does not call onUpload", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    const file = createPdfFile(0);
    const input = screen.getByLabelText("Upload Document") as HTMLInputElement;
    uploadFile(input, file);

    expect(screen.getByText("File cannot be empty")).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });
});
