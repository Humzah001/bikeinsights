import { getSupabase } from "@/lib/supabase/server";
import type { Bike, BikeMedia, Rental, RentalPayment, Repair, Expense, Notification } from "@/lib/types";
import { rentPackagesFromLegacyRow } from "@/lib/rent-packages";
import { v4 as uuidv4 } from "uuid";

/** PostgREST: table not exposed or does not exist (migration not applied). */
function isRentalPaymentsTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const msg = String(error.message ?? "");
  return msg.includes("rental_payments") && (msg.includes("schema cache") || msg.includes("Could not find the table"));
}

export function isRentalPaymentsSetupError(e: unknown): boolean {
  if (e instanceof Error && e.message.includes("rental_payments")) return true;
  if (typeof e === "object" && e !== null && isRentalPaymentsTableMissing(e as { code?: string; message?: string }))
    return true;
  return false;
}

export async function getBikes(tenantId: string): Promise<Bike[]> {
  const { data, error } = await getSupabase()
    .from("bikes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBike);
}

export async function getBikeById(tenantId: string, id: string): Promise<Bike | null> {
  const { data, error } = await getSupabase().from("bikes").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToBike(data as Record<string, unknown>) : null;
}

export async function createBike(tenantId: string, row: Bike): Promise<Bike> {
  const { data, error } = await getSupabase()
    .from("bikes")
    .insert({ ...bikeToRow(row), tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return rowToBike(data as Record<string, unknown>);
}

export async function updateBike(tenantId: string, id: string, updates: Partial<Bike>): Promise<Bike> {
  const { data, error } = await getSupabase()
    .from("bikes")
    .update(bikeToRow(updates as Bike))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToBike(data as Record<string, unknown>);
}

export async function deleteBike(tenantId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from("bikes").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw error;
}

/** Max media files per bike (sync with `MAX_BIKE_MEDIA_FILES_PER_BIKE` in `lib/upload-bike-media-client.ts`). */
export const MAX_MEDIA_PER_BIKE = 24;

function isBikeMediaTableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const msg = String(error.message ?? "");
  return msg.includes("bike_media") && (msg.includes("schema cache") || msg.includes("Could not find the table"));
}

function rowToBikeMedia(r: Record<string, unknown>): BikeMedia {
  const path = r.storage_path ?? r.s3_key;
  return {
    id: String(r.id ?? ""),
    bike_id: String(r.bike_id ?? ""),
    storage_path: String(path ?? ""),
    media_kind: (r.media_kind as BikeMedia["media_kind"]) ?? "image",
    content_type: String(r.content_type ?? "application/octet-stream"),
    sort_order: Number(r.sort_order ?? 0),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

export async function countBikeMedia(tenantId: string, bikeId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("bike_media")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("bike_id", bikeId);
  if (error) {
    if (isBikeMediaTableMissing(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export async function countBikeMediaVideos(tenantId: string, bikeId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("bike_media")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("bike_id", bikeId)
    .eq("media_kind", "video");
  if (error) {
    if (isBikeMediaTableMissing(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

export async function listBikeMediaForBikeIds(tenantId: string, bikeIds: string[]): Promise<BikeMedia[]> {
  if (bikeIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("bike_media")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("bike_id", bikeIds);
  if (error) {
    if (isBikeMediaTableMissing(error)) return [];
    throw error;
  }
  const rows = (data ?? []).map((raw) => rowToBikeMedia(raw as Record<string, unknown>));
  rows.sort((a, b) => {
    const bikeCmp = a.bike_id.localeCompare(b.bike_id);
    if (bikeCmp !== 0) return bikeCmp;
    const o = a.sort_order - b.sort_order;
    if (o !== 0) return o;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  return rows;
}

export async function listBikeMediaForBike(tenantId: string, bikeId: string): Promise<BikeMedia[]> {
  const { data, error } = await getSupabase()
    .from("bike_media")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("bike_id", bikeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (isBikeMediaTableMissing(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => rowToBikeMedia(row as Record<string, unknown>));
}

export async function getBikeMediaById(tenantId: string, bikeId: string, mediaId: string): Promise<BikeMedia | null> {
  const { data, error } = await getSupabase()
    .from("bike_media")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("bike_id", bikeId)
    .eq("id", mediaId)
    .maybeSingle();
  if (error) {
    if (isBikeMediaTableMissing(error)) return null;
    throw error;
  }
  return data ? rowToBikeMedia(data as Record<string, unknown>) : null;
}

export async function createBikeMedia(
  tenantId: string,
  row: Pick<BikeMedia, "id" | "bike_id" | "storage_path" | "media_kind" | "content_type" | "sort_order">
): Promise<BikeMedia> {
  const { data, error } = await getSupabase()
    .from("bike_media")
    .insert({
      id: row.id,
      tenant_id: tenantId,
      bike_id: row.bike_id,
      storage_path: row.storage_path,
      media_kind: row.media_kind,
      content_type: row.content_type,
      sort_order: row.sort_order,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToBikeMedia(data as Record<string, unknown>);
}

export async function deleteBikeMediaRecord(tenantId: string, bikeId: string, mediaId: string): Promise<BikeMedia | null> {
  const existing = await getBikeMediaById(tenantId, bikeId, mediaId);
  if (!existing) return null;
  const { error } = await getSupabase()
    .from("bike_media")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("bike_id", bikeId)
    .eq("id", mediaId);
  if (error) throw error;
  return existing;
}

export async function getNextBikeMediaSortOrder(tenantId: string, bikeId: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from("bike_media")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .eq("bike_id", bikeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isBikeMediaTableMissing(error)) return 0;
    throw error;
  }
  const max = data?.sort_order != null ? Number((data as { sort_order: number }).sort_order) : -1;
  return max + 1;
}

export async function getRentals(tenantId: string): Promise<Rental[]> {
  const { data, error } = await getSupabase()
    .from("rentals")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRental);
}

export async function getRentalById(tenantId: string, id: string): Promise<Rental | null> {
  const { data, error } = await getSupabase()
    .from("rentals")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRental(data as Record<string, unknown>) : null;
}

export async function createRental(tenantId: string, row: Rental): Promise<Rental> {
  const { data, error } = await getSupabase()
    .from("rentals")
    .insert({ ...rentalToRow(row), tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return rowToRental(data as Record<string, unknown>);
}

export async function updateRental(tenantId: string, id: string, updates: Partial<Rental>): Promise<Rental> {
  const { data, error } = await getSupabase()
    .from("rentals")
    .update(rentalToRow(updates as Rental))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRental(data as Record<string, unknown>);
}

export async function deleteRental(tenantId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from("rentals").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw error;
}

function rowToRentalPayment(r: Record<string, unknown>): RentalPayment {
  const dueRaw = r.due_on != null && r.due_on !== "" ? String(r.due_on).slice(0, 10) : "";
  return {
    id: String(r.id ?? ""),
    rental_id: String(r.rental_id ?? ""),
    amount: String(r.amount ?? "0"),
    ...(dueRaw ? { due_on: dueRaw } : {}),
    collected_on: String(r.collected_on ?? "").slice(0, 10),
    week_number: r.week_number != null && r.week_number !== "" ? Number(r.week_number) : null,
    payment_type: (r.payment_type as RentalPayment["payment_type"]) ?? "manual",
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

export async function createRentalPayment(
  tenantId: string,
  row: Omit<RentalPayment, "created_at" | "id"> & { id?: string }
): Promise<RentalPayment> {
  const id = row.id ?? `pay-${uuidv4().slice(0, 12)}`;
  const payload = {
    id,
    tenant_id: tenantId,
    rental_id: row.rental_id,
    amount: row.amount,
    due_on: row.due_on?.trim() || null,
    collected_on: row.collected_on,
    week_number: row.week_number ?? null,
    payment_type: row.payment_type,
  };
  const { data, error } = await getSupabase().from("rental_payments").insert(payload).select().single();
  if (error) {
    if (isRentalPaymentsTableMissing(error)) {
      throw new Error(
        "Database table rental_payments is missing. Open Supabase → SQL Editor, run supabase/migrations/004_rental_payments.sql, then try again."
      );
    }
    throw error;
  }
  return rowToRentalPayment(data as Record<string, unknown>);
}

export async function getAllRentalPayments(tenantId: string): Promise<RentalPayment[]> {
  const { data, error } = await getSupabase()
    .from("rental_payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("collected_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (isRentalPaymentsTableMissing(error)) {
      console.warn(
        "[bikeinsights] rental_payments table missing — run supabase/migrations/004_rental_payments.sql in Supabase SQL Editor."
      );
      return [];
    }
    throw error;
  }
  return (data ?? []).map((r) => rowToRentalPayment(r as Record<string, unknown>));
}

export async function getRepairs(tenantId: string): Promise<Repair[]> {
  const { data, error } = await getSupabase()
    .from("repairs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRepair);
}

export async function getRepairById(tenantId: string, id: string): Promise<Repair | null> {
  const { data, error } = await getSupabase()
    .from("repairs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRepair(data as Record<string, unknown>) : null;
}

export async function createRepair(tenantId: string, row: Repair): Promise<Repair> {
  const { data, error } = await getSupabase()
    .from("repairs")
    .insert({ ...repairToRow(row), tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return rowToRepair(data as Record<string, unknown>);
}

export async function updateRepair(tenantId: string, id: string, updates: Partial<Repair>): Promise<Repair> {
  const { data, error } = await getSupabase()
    .from("repairs")
    .update(repairToRow(updates as Repair))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRepair(data as Record<string, unknown>);
}

export async function deleteRepair(tenantId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from("repairs").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw error;
}

export async function getExpenses(tenantId: string): Promise<Expense[]> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToExpense);
}

export async function getExpenseById(tenantId: string, id: string): Promise<Expense | null> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToExpense(data as Record<string, unknown>) : null;
}

export async function createExpense(tenantId: string, row: Expense): Promise<Expense> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .insert({ ...expenseToRow(row), tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return rowToExpense(data as Record<string, unknown>);
}

export async function deleteExpense(tenantId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from("expenses").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw error;
}

export async function getNotifications(tenantId: string): Promise<Notification[]> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function createNotification(tenantId: string, row: Notification): Promise<Notification> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .insert({ ...notificationToRow(row), tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return rowToNotification(data as Record<string, unknown>);
}

export async function updateNotification(tenantId: string, id: string, updates: Partial<Notification>): Promise<Notification> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .update(notificationToRow(updates as Notification))
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToNotification(data as Record<string, unknown>);
}

export async function updateNotificationsByRentalId(
  tenantId: string,
  rentalId: string,
  updates: Partial<Notification>
): Promise<void> {
  const row = notificationToRow(updates as Notification);
  if (Object.keys(row).length === 0) return;
  const { error } = await getSupabase().from("notifications").update(row).eq("tenant_id", tenantId).eq("rental_id", rentalId);
  if (error) throw error;
}

export async function deleteNotificationsByRentalId(tenantId: string, rentalId: string): Promise<void> {
  const { error } = await getSupabase().from("notifications").delete().eq("tenant_id", tenantId).eq("rental_id", rentalId);
  if (error) throw error;
}

export async function deleteNotification(tenantId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from("notifications").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) throw error;
}

function rowToBike(r: Record<string, unknown>): Bike {
  const rent_packages = rentPackagesFromLegacyRow(r);
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    brand: String(r.brand ?? ""),
    model: String(r.model ?? ""),
    color: String(r.color ?? ""),
    serial_number: String(r.serial_number ?? ""),
    status: (r.status as Bike["status"]) ?? "available",
    purchase_date: String(r.purchase_date ?? ""),
    purchase_price: String(r.purchase_price ?? "0"),
    weekly_rate: String(r.weekly_rate ?? "0"),
    rent_packages,
    image_filename: String(r.image_filename ?? ""),
    notes: String(r.notes ?? ""),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
    tyre_size: String(r.tyre_size ?? ""),
    frame_height_cm: String(r.frame_height_cm ?? ""),
    motor_power_w: String(r.motor_power_w ?? ""),
  };
}

function bikeToRow(b: Partial<Bike>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.id != null) row.id = b.id;
  if (b.name != null) row.name = b.name;
  if (b.brand != null) row.brand = b.brand;
  if (b.model != null) row.model = b.model;
  if (b.color != null) row.color = b.color;
  if (b.serial_number != null) row.serial_number = b.serial_number;
  if (b.status != null) row.status = b.status;
  if (b.purchase_date != null) row.purchase_date = b.purchase_date;
  if (b.purchase_price != null) row.purchase_price = b.purchase_price;
  if (b.weekly_rate != null) row.weekly_rate = b.weekly_rate;
  if (b.rent_packages != null) row.rent_packages = b.rent_packages;
  if (b.image_filename != null) row.image_filename = b.image_filename;
  if (b.notes != null) row.notes = b.notes;
  if (b.tyre_size != null) row.tyre_size = b.tyre_size;
  if (b.frame_height_cm != null) row.frame_height_cm = b.frame_height_cm;
  if (b.motor_power_w != null) row.motor_power_w = b.motor_power_w;
  return row;
}

function rowToRental(r: Record<string, unknown>): Rental {
  return {
    id: String(r.id ?? ""),
    bike_id: String(r.bike_id ?? ""),
    bike_name: String(r.bike_name ?? ""),
    customer_name: String(r.customer_name ?? ""),
    customer_phone: String(r.customer_phone ?? ""),
    customer_email: String(r.customer_email ?? ""),
    start_date: String(r.start_date ?? ""),
    end_date: String(r.end_date ?? ""),
    weekly_rate: String(r.weekly_rate ?? "0"),
    total_amount: String(r.total_amount ?? "0"),
    amount_paid: r.amount_paid != null ? String(r.amount_paid) : undefined,
    weeks: String(r.weeks ?? "0"),
    status: (r.status as Rental["status"]) ?? "active",
    payment_status: (r.payment_status as Rental["payment_status"]) ?? "pending",
    deposit_amount: String(r.deposit_amount ?? "0"),
    deposit_refunded: String(r.deposit_refunded ?? "false"),
    rent_collection_date: String(r.rent_collection_date ?? ""),
    notes: String(r.notes ?? ""),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function rentalToRow(b: Partial<Rental>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.id != null) row.id = b.id;
  if (b.bike_id != null) row.bike_id = b.bike_id;
  if (b.bike_name != null) row.bike_name = b.bike_name;
  if (b.customer_name != null) row.customer_name = b.customer_name;
  if (b.customer_phone != null) row.customer_phone = b.customer_phone;
  if (b.customer_email != null) row.customer_email = b.customer_email;
  if (b.start_date != null) row.start_date = b.start_date;
  if (b.end_date != null) row.end_date = b.end_date;
  if (b.weekly_rate != null) row.weekly_rate = b.weekly_rate;
  if (b.total_amount != null) row.total_amount = b.total_amount;
  if (b.amount_paid != null) row.amount_paid = b.amount_paid;
  if (b.weeks != null) row.weeks = b.weeks;
  if (b.status != null) row.status = b.status;
  if (b.payment_status != null) row.payment_status = b.payment_status;
  if (b.deposit_amount != null) row.deposit_amount = b.deposit_amount;
  if (b.deposit_refunded != null) row.deposit_refunded = b.deposit_refunded;
  if (b.rent_collection_date != null) row.rent_collection_date = b.rent_collection_date;
  if (b.notes != null) row.notes = b.notes;
  return row;
}

function rowToRepair(r: Record<string, unknown>): Repair {
  return {
    id: String(r.id ?? ""),
    bike_id: String(r.bike_id ?? ""),
    bike_name: String(r.bike_name ?? ""),
    description: String(r.description ?? ""),
    repair_date: String(r.repair_date ?? ""),
    cost: String(r.cost ?? "0"),
    repair_shop: String(r.repair_shop ?? ""),
    status: (r.status as Repair["status"]) ?? "pending",
    notes: String(r.notes ?? ""),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function repairToRow(b: Partial<Repair>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.id != null) row.id = b.id;
  if (b.bike_id != null) row.bike_id = b.bike_id;
  if (b.bike_name != null) row.bike_name = b.bike_name;
  if (b.description != null) row.description = b.description;
  if (b.repair_date != null) row.repair_date = b.repair_date;
  if (b.cost != null) row.cost = b.cost;
  if (b.repair_shop != null) row.repair_shop = b.repair_shop;
  if (b.status != null) row.status = b.status;
  if (b.notes != null) row.notes = b.notes;
  return row;
}

function rowToExpense(r: Record<string, unknown>): Expense {
  return {
    id: String(r.id ?? ""),
    bike_id: String(r.bike_id ?? ""),
    bike_name: String(r.bike_name ?? ""),
    category: (r.category as Expense["category"]) ?? "other",
    description: String(r.description ?? ""),
    amount: String(r.amount ?? "0"),
    date: String(r.date ?? ""),
    receipt_filename: String(r.receipt_filename ?? ""),
    notes: String(r.notes ?? ""),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function expenseToRow(b: Partial<Expense>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.id != null) row.id = b.id;
  if (b.bike_id !== undefined) {
    row.bike_id = b.bike_id.trim() === "" ? null : b.bike_id;
  }
  if (b.bike_name != null) row.bike_name = b.bike_name;
  if (b.category != null) row.category = b.category;
  if (b.description != null) row.description = b.description;
  if (b.amount != null) row.amount = b.amount;
  if (b.date != null) row.date = b.date;
  if (b.receipt_filename != null) row.receipt_filename = b.receipt_filename;
  if (b.notes != null) row.notes = b.notes;
  return row;
}

function rowToNotification(r: Record<string, unknown>): Notification {
  return {
    id: String(r.id ?? ""),
    type: (r.type as Notification["type"]) ?? "payment_pending",
    bike_id: String(r.bike_id ?? ""),
    bike_name: String(r.bike_name ?? ""),
    rental_id: String(r.rental_id ?? ""),
    customer_name: String(r.customer_name ?? ""),
    customer_phone: String(r.customer_phone ?? ""),
    message: String(r.message ?? ""),
    is_read: String(r.is_read ?? "false"),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

function notificationToRow(b: Partial<Notification>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (b.id != null) row.id = b.id;
  if (b.type != null) row.type = b.type;
  if (b.bike_id != null) row.bike_id = b.bike_id;
  if (b.bike_name != null) row.bike_name = b.bike_name;
  if (b.rental_id != null) row.rental_id = b.rental_id;
  if (b.customer_name != null) row.customer_name = b.customer_name;
  if (b.customer_phone != null) row.customer_phone = b.customer_phone;
  if (b.message != null) row.message = b.message;
  if (b.is_read != null) row.is_read = b.is_read;
  return row;
}
