import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import * as db from "@/lib/db";
import { BikeStatusBadge } from "@/components/bikes/BikeStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Bike, Rental, Repair, Expense } from "@/lib/types";
import {
  formatCurrency,
  getEarliestNextRentDueAmongRentals,
  impliedWeeklyRentCollectionRows,
} from "@/lib/calculations";
import { format } from "date-fns";
import { Pencil, Plus, Wrench, Wallet, Calendar } from "lucide-react";
import { getTenantAuthOrRedirect } from "@/lib/auth-server";
import * as platformDb from "@/lib/db-platform";

export const dynamic = "force-dynamic";

export default async function BikeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await getTenantAuthOrRedirect();
  const tenant = await platformDb.getTenantById(tenantId);
  const currency = tenant?.currency_symbol?.trim() || "£";
  const { id } = await params;
  const [bikes, rentals, repairs, expenses] = await Promise.all([
    db.getBikes(tenantId),
    db.getRentals(tenantId),
    db.getRepairs(tenantId),
    db.getExpenses(tenantId),
  ]);

  const bike = bikes.find((b) => b.id === id);
  if (!bike) notFound();

  const bikeRentals = rentals.filter((r) => r.bike_id === id);
  const bikeRepairs = repairs.filter((r) => r.bike_id === id);
  const bikeExpenses = expenses.filter((e) => e.bike_id === id);

  const totalRevenue = bikeRentals.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const totalRepairCost = bikeRepairs.reduce((sum, r) => sum + Number(r.cost), 0);
  const totalExpenseCost = bikeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalRevenue - totalRepairCost - totalExpenseCost;

  const today = new Date();
  const nextRentDue = getEarliestNextRentDueAmongRentals(bikeRentals, today);
  const rentCollectionHistory = bikeRentals
    .flatMap((r) => impliedWeeklyRentCollectionRows(r))
    .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

  const currentRental = bikeRentals.find(
    (r) => r.status === "active" || r.status === "overdue" || r.status === "inactive"
  );

  const imageSrc = bike.image_filename
    ? `/uploads/bikes/${bike.image_filename}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bikes">← Bikes</Link>
          </Button>
          <h1 className="text-2xl font-bold">{bike.name}</h1>
          <BikeStatusBadge status={bike.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/bikes/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rentals/add?bike_id=${id}`}>
              <Calendar className="mr-2 h-4 w-4" />
              Add rental
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/repairs/add?bike_id=${id}`}>
              <Wrench className="mr-2 h-4 w-4" />
              Add repair
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/expenses/add?bike_id=${id}`}>
              <Wallet className="mr-2 h-4 w-4" />
              Add expense
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={bike.name}
                width={600}
                height={340}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">
                🚲
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <p className="text-muted-foreground">
              {bike.brand} {bike.model}
              {bike.color && ` · ${bike.color}`}
            </p>
            {bike.serial_number && (
              <p className="text-sm text-muted-foreground">S/N: {bike.serial_number}</p>
            )}
            <p className="mt-2">
              <span className="font-semibold">{formatCurrency(Number(bike.weekly_rate || 0), currency)}</span>
              <span className="text-muted-foreground">/week</span>
            </p>
            {bike.purchase_date && (
              <p className="text-sm text-muted-foreground">
                Purchased: {bike.purchase_date}
                {bike.purchase_price && ` · ${formatCurrency(Number(bike.purchase_price), currency)}`}
              </p>
            )}
            {bike.notes && (
              <p className="mt-2 text-sm text-muted-foreground">{bike.notes}</p>
            )}
            {currentRental && (
              <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                <p className="text-sm font-medium">Current rental</p>
                <p>{currentRental.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {currentRental.start_date} – {currentRental.end_date}
                </p>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href={`/rentals/${currentRental.id}`}>View rental →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Collected rent: {formatCurrency(totalRevenue, currency)}</p>
              <p>Total repairs: {formatCurrency(totalRepairCost, currency)}</p>
              <p>Total expenses: {formatCurrency(totalExpenseCost, currency)}</p>
              <p
                className={
                  netProfit >= 0
                    ? "font-semibold text-green-600 dark:text-green-400"
                    : "font-semibold text-red-600 dark:text-red-400"
                }
              >
                Net profit: {formatCurrency(netProfit, currency)}
              </p>
              {nextRentDue ? (
                <p className="border-t pt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Next rent due: </span>
                  {format(nextRentDue.dueDate, "EEE d MMM yyyy")} (week {nextRentDue.weekNum}) —{" "}
                  {nextRentDue.customerName}
                  <Button variant="link" size="sm" className="h-auto p-0 pl-1 align-baseline" asChild>
                    <Link href={`/rentals/${nextRentDue.rentalId}`}>Open rental</Link>
                  </Button>
                </p>
              ) : bikeRentals.length > 0 ? (
                <p className="border-t pt-2 text-sm text-muted-foreground">
                  No upcoming rent due—contracts are fully paid or have no future weeks scheduled.
                </p>
              ) : null}
            </CardContent>
          </Card>

        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collected rent history</CardTitle>
          <CardDescription>
            Each row is one week of rent implied by your recorded payments and the weekly due schedule (first rent due
            date on the rental, then +7 days per week). Exact collection times are not stored—only totals on the rental.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Due date (rent week)</TableHead>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rental period</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentCollectionHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No rent collected yet for this bike
                  </TableCell>
                </TableRow>
              ) : (
                rentCollectionHistory.map((row, i) => (
                  <TableRow key={`${row.rentalId}-w${row.weekIndex}-${row.dueDate.getTime()}-${i}`}>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">{format(row.dueDate, "EEE d MMM yyyy")}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{format(row.dueDate, "yyyy-MM-dd")}</span>
                    </TableCell>
                    <TableCell>
                      {row.weekIndex}
                      {row.isPartial ? (
                        <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(partial)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.amount, currency)}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {row.contractStart} → {row.contractEnd}
                    </TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link href={`/rentals/${row.rentalId}`}>Rental</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rental history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[400px]">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Contract total</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bikeRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No rentals yet
                  </TableCell>
                </TableRow>
              ) : (
                bikeRentals
                  .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/rentals/${r.id}`} className="text-primary hover:underline">
                          {r.customer_name}
                        </Link>
                      </TableCell>
                      <TableCell>{r.start_date}</TableCell>
                      <TableCell>{r.end_date}</TableCell>
                      <TableCell>{formatCurrency(Number(r.total_amount), currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number(r.amount_paid || 0), currency)}
                      </TableCell>
                      <TableCell>{r.payment_status}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repair history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[400px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bikeRepairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No repairs yet
                  </TableCell>
                </TableRow>
              ) : (
                bikeRepairs
                  .sort((a, b) => new Date(b.repair_date).getTime() - new Date(a.repair_date).getTime())
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.repair_date}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{r.repair_shop}</TableCell>
                      <TableCell>{formatCurrency(Number(r.cost), currency)}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[360px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bikeExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No expenses yet
                  </TableCell>
                </TableRow>
              ) : (
                bikeExpenses
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.date}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{formatCurrency(Number(e.amount), currency)}</TableCell>
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
