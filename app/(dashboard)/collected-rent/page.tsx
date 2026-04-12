import Link from "next/link";
import * as db from "@/lib/db";
import type { Rental, RentalPayment } from "@/lib/types";
import type { RentalForPendingRent } from "@/lib/calculations";
import {
  formatCurrency,
  findContractWeekForDueDate,
  formatRentWeekDueDate,
} from "@/lib/calculations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parse, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

function scheduledDueIso(p: RentalPayment, rental: Rental | null | undefined): string | null {
  if (p.due_on?.trim()) return p.due_on.trim();
  if (rental && p.week_number != null) {
    return formatRentWeekDueDate(
      {
        start_date: rental.start_date,
        weeks: rental.weeks,
        weekly_rate: rental.weekly_rate,
        amount_paid: rental.amount_paid,
        rent_collection_date: rental.rent_collection_date,
      },
      p.week_number
    );
  }
  return null;
}

function DateCell({ iso }: { iso: string | null }) {
  if (!iso) {
    return (
      <TableCell className="text-muted-foreground">
        <span>—</span>
      </TableCell>
    );
  }
  return (
    <TableCell className="whitespace-nowrap">
      <span className="font-medium">{format(parse(iso, "yyyy-MM-dd", new Date()), "EEE d MMM yyyy")}</span>
      <span className="ml-2 text-xs font-normal text-muted-foreground">{iso}</span>
    </TableCell>
  );
}

function rentalAsPending(r: Rental): RentalForPendingRent {
  return {
    start_date: r.start_date,
    weeks: r.weeks,
    weekly_rate: r.weekly_rate,
    amount_paid: r.amount_paid,
    rent_collection_date: r.rent_collection_date,
  };
}

/** Scheduled due date plus contract week (Week N). */
function ScheduledDueWithWeekCell({
  payment: p,
  rental,
}: {
  payment: RentalPayment;
  rental: Rental | null | undefined;
}) {
  const iso = scheduledDueIso(p, rental);
  if (!iso) {
    return (
      <TableCell className="text-muted-foreground">
        <span>—</span>
      </TableCell>
    );
  }
  const weekNum =
    p.week_number ??
    (rental ? findContractWeekForDueDate(rentalAsPending(rental), iso) : null);
  return (
    <TableCell>
      <div className="flex flex-col gap-0.5">
        {weekNum != null ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Week {weekNum}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Week —</span>
        )}
        <div className="whitespace-nowrap">
          <span className="font-medium">{format(parse(iso, "yyyy-MM-dd", new Date()), "EEE d MMM yyyy")}</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">{iso}</span>
        </div>
      </div>
    </TableCell>
  );
}

function paymentTypeLabel(t: RentalPayment["payment_type"]): string {
  switch (t) {
    case "weekly":
      return "Weekly";
    case "manual":
      return "Manual";
    case "settlement":
      return "Full settlement";
    case "initial":
      return "Initial (new rental)";
    case "adjustment":
      return "Balance set";
    default:
      return t;
  }
}

export default async function CollectedRentPage() {
  const [payments, rentals, bikes] = await Promise.all([
    db.getAllRentalPayments(),
    db.getRentals(),
    db.getBikes(),
  ]);

  const rentalById = new Map(rentals.map((r) => [r.id, r]));
  const bikeById = new Map(bikes.map((b) => [b.id, b]));

  const rows = payments.map((p) => {
    const rental = rentalById.get(p.rental_id);
    const bike = rental ? bikeById.get(rental.bike_id) : undefined;
    return { payment: p, rental, bike };
  });

  const totalListed = rows.reduce((s, { payment }) => s + Number(payment.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Collected rent log</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Rent due</span> shows contract week number and scheduled date (first
          rent due on the contract, then +7 days per week—often Tuesday if you use the default).{" "}
          <span className="font-medium text-foreground">Collected on</span> is the calendar day from your device when you
          saved the payment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All collections</CardTitle>
          <CardDescription>
            {rows.length} entr{rows.length !== 1 ? "ies" : "y"}
            {rows.length > 0 ? ` · ${formatCurrency(totalListed)} in this list` : ""}. Older activity may only appear on
            the rental if it was recorded before this log existed.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow>
                <TableHead>Rent due (week · date)</TableHead>
                <TableHead>Collected on (recorded)</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bike</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rental period</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Logged</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No payment rows yet. Record rent from a rental, or run the database migrations for{" "}
                    <code className="text-xs">rental_payments</code> (and <code className="text-xs">due_on</code> column).
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ payment: p, rental, bike }) => (
                  <TableRow key={p.id}>
                    <ScheduledDueWithWeekCell payment={p} rental={rental} />
                    <DateCell iso={p.collected_on || null} />
                    <TableCell className="text-right tabular-nums">{formatCurrency(Number(p.amount))}</TableCell>
                    <TableCell>{paymentTypeLabel(p.payment_type)}</TableCell>
                    <TableCell>
                      {bike ? (
                        <Link href={`/bikes/${bike.id}`} className="text-primary hover:underline">
                          {bike.name}
                        </Link>
                      ) : rental ? (
                        <span className="text-muted-foreground">{rental.bike_name || "—"}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {bike ? (
                        <div className="text-xs text-muted-foreground">
                          {bike.brand} {bike.model}
                          {bike.color ? ` · ${bike.color}` : ""}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {rental ? (
                        <>
                          <span>{rental.customer_name}</span>
                          {rental.customer_email ? (
                            <div className="text-xs text-muted-foreground">{rental.customer_email}</div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Rental removed</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {rental ? `${rental.start_date} → ${rental.end_date}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{rental?.customer_phone || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(parseISO(p.created_at), "d MMM yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {rental ? (
                        <Link href={`/rentals/${rental.id}`} className="text-sm text-primary hover:underline">
                          Rental
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
