import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import * as db from "@/lib/db";
import { BikeStatusBadge } from "@/components/bikes/BikeStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Bike, Rental, Repair, Expense } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { Pencil, Plus, Wrench, Wallet, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BikeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bikes, rentals, repairs, expenses] = await Promise.all([
    db.getBikes(),
    db.getRentals(),
    db.getRepairs(),
    db.getExpenses(),
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
              <span className="font-semibold">£{bike.weekly_rate}</span>
              <span className="text-muted-foreground">/week</span>
            </p>
            {bike.purchase_date && (
              <p className="text-sm text-muted-foreground">
                Purchased: {bike.purchase_date}
                {bike.purchase_price && ` · £${bike.purchase_price}`}
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
              <p>Collected rent: {formatCurrency(totalRevenue)}</p>
              <p>Total repairs: {formatCurrency(totalRepairCost)}</p>
              <p>Total expenses: {formatCurrency(totalExpenseCost)}</p>
              <p
                className={
                  netProfit >= 0
                    ? "font-semibold text-green-600 dark:text-green-400"
                    : "font-semibold text-red-600 dark:text-red-400"
                }
              >
                Net profit: {formatCurrency(netProfit)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

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
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bikeRentals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                      <TableCell>£{r.total_amount}</TableCell>
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
                      <TableCell>£{r.cost}</TableCell>
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
                      <TableCell>£{e.amount}</TableCell>
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
