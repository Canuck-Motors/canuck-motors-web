"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getCurrentPublicUserId() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error("Customer profile is unavailable.");
  }

  return { supabase, userId: profile.id };
}

export async function addToCart(productId: number) {
  const { supabase, userId } = await getCurrentPublicUserId();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("is_active", true)
    .eq("is_delete", false)
    .maybeSingle();

  if (productError || !product) {
    throw new Error("This product is unavailable.");
  }

  // eslint-disable-next-line prefer-const -- cart is reassigned below
  let { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (cartError) {
    throw new Error("Unable to load your cart.");
  }

  if (!cart) {
    const { data: createdCart, error: createCartError } = await supabase
      .from("carts")
      .insert({ user_id: userId, status: "active" })
      .select("id")
      .single();

    if (createCartError || !createdCart) {
      throw new Error("Unable to create your cart.");
    }

    cart = createdCart;
  }

  const { data: existingItem, error: itemLookupError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (itemLookupError) {
    throw new Error("Unable to update your cart.");
  }

  if (existingItem) {
    const nextQuantity = Math.min(existingItem.quantity + 1, 99);

    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: nextQuantity,
        updated_on: new Date().toISOString(),
      })
      .eq("id", existingItem.id);

    if (error) {
      throw new Error("Unable to update your cart.");
    }
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: productId,
      quantity: 1,
    });

    if (error) {
      throw new Error("Unable to add this product to your cart.");
    }
  }

  // Stay on the page: the cart animation shows the item was added
  revalidatePath("/cart");
}

export async function updateCartQuantity(itemId: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error("Quantity must be between 1 and 99.");
  }

  const { supabase } = await getCurrentPublicUserId();

  const { error } = await supabase
    .from("cart_items")
    .update({
      quantity,
      updated_on: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    throw new Error("Unable to update quantity.");
  }

  revalidatePath("/cart");
}

export async function removeCartItem(itemId: number) {
  const { supabase } = await getCurrentPublicUserId();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error("Unable to remove this item.");
  }

  revalidatePath("/cart");
}
