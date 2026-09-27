import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { CompareProvider, useCompareContext } from "@/context/CompareContext";
import { AddToCompareButton } from "../AddToCompareButton";
import { CompareBar } from "../CompareBar";
import { CompareTable } from "../CompareTable";
import type { ComparableInvoice } from "@/lib/compare";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({}),
    usePathname: () => "/marketplace",
    useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-06-01T00:00:00.000Z");

// Radix's tooltip measures its trigger via ResizeObserver, which jsdom lacks.
beforeAll(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
});

afterEach(() => {
    vi.restoreAllMocks();
});

function makeComparable(id: string, overrides: Partial<ComparableInvoice> = {}): ComparableInvoice {
    return {
        id,
        title: `${id} receivable`,
        issuer_id: "issuer-1",
        issuer_name: "Northwind Trading Ltd",
        face_value: 10_000,
        yield_bps: 825,
        maturity_date: "2026-12-01T00:00:00.000Z",
        status: "open",
        raised: 2_500,
        investor_count: 2,
        issuer_score: 88,
        ...overrides,
    };
}

function renderWithCompare(ui: ReactElement) {
    return render(<CompareProvider>{ui}</CompareProvider>);
}

/** Adds an invoice to the comparison by clicking its card button. */
function selectInvoice(id: string) {
    fireEvent.click(screen.getByTestId(`add-to-compare-${id}`));
}

describe("CompareProvider", () => {
    it("throws a helpful error when used outside the provider", () => {
        function Orphan() {
            useCompareContext();
            return null;
        }
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => render(<Orphan />)).toThrow(/must be used within a CompareProvider/);
        spy.mockRestore();
    });

    it("accumulates invoices up to the cap and refuses the fourth", () => {
        function Harness() {
            const { items, isFull, add, clear } = useCompareContext();
            return (
                <div>
                    <p data-testid="count">{items.length}</p>
                    <p data-testid="full">{String(isFull)}</p>
                    {["a", "b", "c", "d"].map((id) => (
                        <button key={id} data-testid={`add-${id}`} onClick={() => add(makeComparable(id))}>
                            add {id}
                        </button>
                    ))}
                    <button data-testid="clear" onClick={clear}>
                        clear
                    </button>
                </div>
            );
        }

        renderWithCompare(<Harness />);

        fireEvent.click(screen.getByTestId("add-a"));
        fireEvent.click(screen.getByTestId("add-b"));
        expect(screen.getByTestId("count")).toHaveTextContent("2");
        expect(screen.getByTestId("full")).toHaveTextContent("false");

        fireEvent.click(screen.getByTestId("add-c"));
        expect(screen.getByTestId("count")).toHaveTextContent("3");
        expect(screen.getByTestId("full")).toHaveTextContent("true");

        fireEvent.click(screen.getByTestId("add-d"));
        expect(screen.getByTestId("count")).toHaveTextContent("3");

        fireEvent.click(screen.getByTestId("clear"));
        expect(screen.getByTestId("count")).toHaveTextContent("0");
    });

    it("toggles an item off when it is already selected", () => {
        function Harness() {
            const { items, toggle } = useCompareContext();
            return (
                <div>
                    <p data-testid="count">{items.length}</p>
                    <button data-testid="toggle" onClick={() => toggle(makeComparable("a"))}>
                        toggle
                    </button>
                </div>
            );
        }

        renderWithCompare(<Harness />);

        fireEvent.click(screen.getByTestId("toggle"));
        expect(screen.getByTestId("count")).toHaveTextContent("1");
        fireEvent.click(screen.getByTestId("toggle"));
        expect(screen.getByTestId("count")).toHaveTextContent("0");
    });
});

describe("AddToCompareButton", () => {
    function Cards() {
        return (
            <div>
                {["a", "b", "c", "d"].map((id) => (
                    <AddToCompareButton key={id} invoice={makeComparable(id)} />
                ))}
            </div>
        );
    }

    it("adds an invoice to the comparison and reflects the pressed state", () => {
        renderWithCompare(<Cards />);

        const button = screen.getByTestId("add-to-compare-a");
        expect(button).toHaveAttribute("aria-pressed", "false");

        fireEvent.click(button);

        expect(button).toHaveAttribute("aria-pressed", "true");
        expect(button).toHaveTextContent("In compare");
    });

    it("disables further selection once three invoices are chosen", () => {
        renderWithCompare(<Cards />);

        selectInvoice("a");
        selectInvoice("b");
        selectInvoice("c");

        const fourth = screen.getByTestId("add-to-compare-d");
        expect(fourth).toBeDisabled();
    });

    it("exposes the limit reason in a tooltip on the locked control", async () => {
        renderWithCompare(<Cards />);

        selectInvoice("a");
        selectInvoice("b");
        selectInvoice("c");

        const wrapper = screen.getByTestId("compare-locked-wrapper-d");
        fireEvent.focus(wrapper);

        const tooltip = await screen.findByText(/You can compare up to 3 invoices/);
        expect(tooltip).toBeInTheDocument();
    });

    it("keeps a selected invoice removable at the cap", () => {
        renderWithCompare(<Cards />);

        selectInvoice("a");
        selectInvoice("b");
        selectInvoice("c");

        const selected = screen.getByTestId("add-to-compare-a");
        expect(selected).not.toBeDisabled();

        fireEvent.click(selected);
        expect(selected).toHaveAttribute("aria-pressed", "false");
        // Having freed a slot, a new invoice can be added again.
        expect(screen.getByTestId("add-to-compare-d")).not.toBeDisabled();
    });
});

describe("CompareBar", () => {
    function Harness() {
        return (
            <div>
                {["a", "b", "c"].map((id) => (
                    <AddToCompareButton key={id} invoice={makeComparable(id)} showLabel={false} />
                ))}
                <CompareBar />
            </div>
        );
    }

    it("renders nothing while the comparison is empty", () => {
        renderWithCompare(<Harness />);
        expect(screen.queryByTestId("compare-bar")).not.toBeInTheDocument();
    });

    it("shows the selected invoices and the running count", () => {
        renderWithCompare(<Harness />);

        selectInvoice("a");
        selectInvoice("b");

        expect(screen.getByTestId("compare-bar")).toBeInTheDocument();
        expect(screen.getByTestId("compare-bar-count")).toHaveTextContent("2 of 3 selected");
        expect(screen.getByTestId("compare-bar-item-a")).toHaveTextContent("a receivable");
        expect(screen.getByTestId("compare-bar-item-b")).toHaveTextContent("b receivable");
    });

    it("updates as invoices are removed individually", () => {
        renderWithCompare(<Harness />);

        selectInvoice("a");
        selectInvoice("b");
        selectInvoice("c");
        expect(screen.getByTestId("compare-bar-count")).toHaveTextContent("3 of 3 selected");

        fireEvent.click(screen.getByTestId("compare-bar-remove-b"));

        expect(screen.getByTestId("compare-bar-count")).toHaveTextContent("2 of 3 selected");
        expect(screen.queryByTestId("compare-bar-item-b")).not.toBeInTheDocument();
    });

    it("clears every selected invoice", () => {
        renderWithCompare(<Harness />);

        selectInvoice("a");
        selectInvoice("b");

        fireEvent.click(screen.getByTestId("compare-bar-clear"));

        expect(screen.queryByTestId("compare-bar")).not.toBeInTheDocument();
        expect(screen.getByTestId("add-to-compare-a")).toHaveAttribute("aria-pressed", "false");
    });

    it("links through to the compare page", () => {
        renderWithCompare(<Harness />);
        selectInvoice("a");

        expect(screen.getByTestId("compare-bar-view")).toHaveAttribute(
            "href",
            "/marketplace/compare"
        );
    });
});

describe("CompareTable", () => {
    const items = [
        makeComparable("a", { yield_bps: 825, face_value: 10_000, raised: 2_500, issuer_score: 88 }),
        makeComparable("b", { yield_bps: 1_050, face_value: 25_000, raised: 25_000, issuer_score: null }),
    ];

    it("shows an empty state with no selections", () => {
        render(<CompareTable items={[]} />);
        expect(screen.getByTestId("compare-empty")).toBeInTheDocument();
    });

    it("renders a column per invoice", () => {
        render(<CompareTable items={items} now={NOW} />);

        expect(screen.getByTestId("compare-table")).toBeInTheDocument();
        expect(screen.getByTestId("compare-column-a")).toHaveTextContent("a receivable");
        expect(screen.getByTestId("compare-column-b")).toHaveTextContent("b receivable");
    });

    it("renders each metric correctly per invoice", () => {
        render(<CompareTable items={items} now={NOW} />);

        expect(screen.getByTestId("row-yield-a")).toHaveTextContent("8.25%");
        expect(screen.getByTestId("row-yield-b")).toHaveTextContent("10.50%");
        expect(screen.getByTestId("row-face-value-a")).toHaveTextContent("10,000.00 XLM");
        expect(screen.getByTestId("row-face-value-b")).toHaveTextContent("25,000.00 XLM");
        expect(screen.getByTestId("row-maturity-a")).toHaveTextContent("01 Dec 2026");
        expect(screen.getByTestId("row-issuer-score-a")).toHaveTextContent("88");
        expect(screen.getByTestId("row-funding-a")).toHaveTextContent("25.0%");
        expect(screen.getByTestId("row-funding-b")).toHaveTextContent("100.0%");
    });

    it("marks an issuer with no settlement history rather than scoring it zero", () => {
        render(<CompareTable items={items} now={NOW} />);
        expect(screen.getByTestId("row-issuer-score-b")).toHaveTextContent("No track record");
    });

    it("links each invest CTA to the correct invoice detail page", () => {
        render(<CompareTable items={items} now={NOW} />);

        expect(screen.getByTestId("compare-invest-a")).toHaveAttribute(
            "href",
            "/marketplace/a"
        );
        expect(screen.getByTestId("compare-invest-b")).toHaveAttribute(
            "href",
            "/marketplace/b"
        );
    });

    it("hides the invest CTA for an invoice that is not open", () => {
        render(
            <CompareTable
                items={[makeComparable("a", { status: "settled" })]}
                now={NOW}
            />
        );

        expect(screen.queryByTestId("compare-invest-a")).not.toBeInTheDocument();
        expect(screen.getByTestId("compare-closed-a")).toHaveTextContent(
            "Not open for investment"
        );
    });

    it("hides the invest CTA once an invoice has matured", () => {
        render(
            <CompareTable
                items={[makeComparable("a", { maturity_date: "2026-01-01T00:00:00.000Z" })]}
                now={NOW}
            />
        );

        expect(screen.queryByTestId("compare-invest-a")).not.toBeInTheDocument();
    });
});

describe("CompareTable and CompareBar together", () => {
    it("reflects a clear-all from the bar inside the table", () => {
        function Harness() {
            return (
                <div>
                    {["a", "b"].map((id) => (
                        <AddToCompareButton key={id} invoice={makeComparable(id)} />
                    ))}
                    <CompareBar />
                    <TableFromContext />
                </div>
            );
        }

        function TableFromContext() {
            const { items } = useCompareContext();
            return <CompareTable items={items} now={NOW} />;
        }

        renderWithCompare(<Harness />);

        selectInvoice("a");
        selectInvoice("b");
        expect(screen.getByTestId("compare-table")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("compare-bar-clear"));

        expect(screen.getByTestId("compare-empty")).toBeInTheDocument();
        expect(screen.queryByTestId("compare-bar")).not.toBeInTheDocument();
    });

    it("keeps the bar count in step with the table columns", () => {
        function Harness() {
            const { items } = useCompareContext();
            return (
                <div>
                    {["a", "b", "c"].map((id) => (
                        <AddToCompareButton key={id} invoice={makeComparable(id)} />
                    ))}
                    <CompareBar />
                    <CompareTable items={items} now={NOW} />
                </div>
            );
        }

        renderWithCompare(<Harness />);

        selectInvoice("a");
        selectInvoice("b");

        const bar = screen.getByTestId("compare-bar");
        const table = screen.getByTestId("compare-table");

        expect(within(bar).getByTestId("compare-bar-count")).toHaveTextContent("2 of 3 selected");
        expect(within(table).getAllByRole("columnheader")).toHaveLength(3); // metric + 2 invoices
    });
});
