"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestCancellation(orderId: string, reason: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("request_order_cancellation", {
    p_order_id: orderId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
}

export async function requestReturnOrExchange(input: {
  orderId: string;
  requestType: "return" | "exchange";
  reasonCode: string;
  reasonText: string;
  items: Array<{
    order_item_id: number;
    quantity: number;
    replacement_product_id?: number | null;
  }>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_return_request", {
    p_order_id: input.orderId,
    p_request_type: input.requestType,
    p_reason_code: input.reasonCode,
    p_reason_text: input.reasonText,
    p_items: input.items,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/account/orders/${input.orderId}`);
  revalidatePath("/account/orders");
}
