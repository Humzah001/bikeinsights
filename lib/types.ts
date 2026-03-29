export type BikeStatus = "available" | "rented" | "under_repair" | "retired";
export type RentalStatus = "active" | "completed" | "overdue" | "inactive";
export type PaymentStatus = "paid" | "pending" | "partial";
export type RepairStatus = "pending" | "in_progress" | "completed";
export type ExpenseCategory =
  | "fuel"
  | "storage"
  | "insurance"
  | "accessories"
  | "cleaning"
  | "other";
export type NotificationType =
  | "rent_overdue"
  | "rent_due_soon"
  | "repair_due"
  | "payment_pending"
  | "week_rent_pending";

export interface Bike {
  id: string;
  name: string;
  brand: string;
  model: string;
  color: string;
  serial_number: string;
  status: BikeStatus;
  purchase_date: string;
  purchase_price: string;
  weekly_rate: string;
  image_filename: string;
  notes: string;
  created_at: string;
}

export interface Rental {
  id: string;
  bike_id: string;
  bike_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  start_date: string;
  end_date: string;
  weekly_rate: string;
  total_amount: string;
  amount_paid?: string; // running total received (weekly payments)
  weeks: string;
  status: RentalStatus;
  payment_status: PaymentStatus;
  /** Security deposit held; refund when the bike is returned. */
  deposit_amount?: string;
  /** Whether the deposit has been returned to the customer. */
  deposit_refunded?: string;
  /**
   * First weekly rent due date (YYYY-MM-DD). Week 2 is +7 days, etc.
   * Empty = first Tuesday on or after start_date (legacy).
   */
  rent_collection_date?: string;
  notes: string;
  created_at: string;
}

export interface Repair {
  id: string;
  bike_id: string;
  bike_name: string;
  description: string;
  repair_date: string;
  cost: string;
  repair_shop: string;
  status: RepairStatus;
  notes: string;
  created_at: string;
}

export interface Expense {
  id: string;
  bike_id: string;
  bike_name: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  date: string;
  receipt_filename: string;
  notes: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  bike_id: string;
  bike_name: string;
  rental_id: string;
  customer_name: string;
  customer_phone: string;
  message: string;
  is_read: string;
  created_at: string;
}
