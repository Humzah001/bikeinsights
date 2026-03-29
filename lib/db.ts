import { getSupabase } from "@/lib/supabase/server";
import type { Bike, Rental, Repair, Expense, Notification } from "@/lib/types";

export async function getBikes(): Promise<Bike[]> {
  const { data, error } = await getSupabase().from("bikes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBike);
}

export async function getBikeById(id: string): Promise<Bike | null> {
  const { data, error } = await getSupabase().from("bikes").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToBike(data) : null;
}

export async function createBike(row: Bike): Promise<Bike> {
  const { data, error } = await getSupabase().from("bikes").insert(bikeToRow(row)).select().single();
  if (error) throw error;
  return rowToBike(data);
}

export async function updateBike(id: string, updates: Partial<Bike>): Promise<Bike> {
  const { data, error } = await getSupabase().from("bikes").update(bikeToRow(updates as Bike)).eq("id", id).select().single();
  if (error) throw error;
  return rowToBike(data);
}

export async function deleteBike(id: string): Promise<void> {
  const { error } = await getSupabase().from("bikes").delete().eq("id", id);
  if (error) throw error;
}

export async function getRentals(): Promise<Rental[]> {
  const { data, error } = await getSupabase().from("rentals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRental);
}

export async function getRentalById(id: string): Promise<Rental | null> {
  const { data, error } = await getSupabase().from("rentals").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToRental(data) : null;
}

export async function createRental(row: Rental): Promise<Rental> {
  const { data, error } = await getSupabase().from("rentals").insert(rentalToRow(row)).select().single();
  if (error) throw error;
  return rowToRental(data);
}

export async function updateRental(id: string, updates: Partial<Rental>): Promise<Rental> {
  const { data, error } = await getSupabase().from("rentals").update(rentalToRow(updates as Rental)).eq("id", id).select().single();
  if (error) throw error;
  return rowToRental(data);
}

export async function deleteRental(id: string): Promise<void> {
  const { error } = await getSupabase().from("rentals").delete().eq("id", id);
  if (error) throw error;
}

export async function getRepairs(): Promise<Repair[]> {
  const { data, error } = await getSupabase().from("repairs").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRepair);
}

export async function getRepairById(id: string): Promise<Repair | null> {
  const { data, error } = await getSupabase().from("repairs").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToRepair(data) : null;
}

export async function createRepair(row: Repair): Promise<Repair> {
  const { data, error } = await getSupabase().from("repairs").insert(repairToRow(row)).select().single();
  if (error) throw error;
  return rowToRepair(data);
}

export async function updateRepair(id: string, updates: Partial<Repair>): Promise<Repair> {
  const { data, error } = await getSupabase().from("repairs").update(repairToRow(updates as Repair)).eq("id", id).select().single();
  if (error) throw error;
  return rowToRepair(data);
}

export async function deleteRepair(id: string): Promise<void> {
  const { error } = await getSupabase().from("repairs").delete().eq("id", id);
  if (error) throw error;
}

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await getSupabase().from("expenses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToExpense);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const { data, error } = await getSupabase().from("expenses").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToExpense(data) : null;
}

export async function createExpense(row: Expense): Promise<Expense> {
  const { data, error } = await getSupabase().from("expenses").insert(expenseToRow(row)).select().single();
  if (error) throw error;
  return rowToExpense(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await getSupabase().from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await getSupabase().from("notifications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function createNotification(row: Notification): Promise<Notification> {
  const { data, error } = await getSupabase().from("notifications").insert(notificationToRow(row)).select().single();
  if (error) throw error;
  return rowToNotification(data);
}

export async function updateNotification(id: string, updates: Partial<Notification>): Promise<Notification> {
  const { data, error } = await getSupabase().from("notifications").update(notificationToRow(updates as Notification)).eq("id", id).select().single();
  if (error) throw error;
  return rowToNotification(data);
}

/** Update all notifications for a given rental (e.g. mark as read when rental completes). */
export async function updateNotificationsByRentalId(rentalId: string, updates: Partial<Notification>): Promise<void> {
  const row = notificationToRow(updates as Notification);
  if (Object.keys(row).length === 0) return;
  const { error } = await getSupabase().from("notifications").update(row).eq("rental_id", rentalId);
  if (error) throw error;
}

export async function deleteNotificationsByRentalId(rentalId: string): Promise<void> {
  const { error } = await getSupabase().from("notifications").delete().eq("rental_id", rentalId);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await getSupabase().from("notifications").delete().eq("id", id);
  if (error) throw error;
}

// Helpers: Supabase returns snake_case; our types use snake_case so we just ensure defaults and types
function rowToBike(r: Record<string, unknown>): Bike {
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
    image_filename: String(r.image_filename ?? ""),
    notes: String(r.notes ?? ""),
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
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
  if (b.image_filename != null) row.image_filename = b.image_filename;
  if (b.notes != null) row.notes = b.notes;
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
  if (b.bike_id != null) row.bike_id = b.bike_id;
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
