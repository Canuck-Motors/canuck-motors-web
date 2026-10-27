"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAmazonRedirectOn } from "@/lib/fulfillment-mode";

const CART_EXPIRY_DAYS = 7;

function cartExpiryCutoff() {
  return new Date(Date.now() - CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

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

async function touchCart(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cartId: string,
) {
  await supabase
    .from("carts")
    .update({ updated_on: new Date().toISOString() })
    .eq("id", cartId);
}

export async function addToCart(productId: number): Promise<{ error?: string } | void> {
  if (await isAmazonRedirectOn()) {
    return { error: "Please buy this part on Amazon." };
  }
  const { supabase, userId } = await getCurrentPublicUserId();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, inventory(quantity, reserved_quantity, is_active)")
    .eq("id", productId)
    .eq("is_active", true)
    .eq("is_delete", false)
    .maybeSingle();

  if (productError || !product) {
    throw new Error("This product is unavailable.");
  }

  const inventory = Array.isArray(product.inventory)
    ? product.inventory[0]
    : product.inventory;
  const available = inventory?.is_active
    ? Math.max(0, Number(inventory.quantity ?? 0) - Number(inventory.reserved_quantity ?? 0))
    : 0;

  if (available < 1) {
    return { error: "Sorry, this part is currently out of stock." };
  }

  const { data: loadedCart, error: cartError } = await supabase
    .from("carts")
    .select("id, updated_on")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (cartError) {
    throw new Error("Unable to load your cart.");
  }

  let cart = loadedCart;

  if (cart && new Date(cart.updated_on) < cartExpiryCutoff()) {
    const { error: abandonError } = await supabase
      .from("carts")
      .update({
        status: "abandoned",
        updated_on: new Date().toISOString(),
      })
      .eq("id", cart.id);

    if (abandonError) {
      throw new Error("Unable to refresh your cart.");
    }

    cart = null;
  }

  if (!cart) {
    const { data: createdCart, error: createCartError } = await supabase
      .from("carts")
      .insert({ user_id: userId, status: "active" })
      .select("id, updated_on")
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
    if (existingItem.quantity >= available) {
      return {
        error:
          available === 1
            ? "This is the last one currently available, and it’s already in your cart."
            : `You already have the full available quantity (${available}) of this item in your cart.`,
      };
    }

    const nextQuantity = Math.min(existingItem.quantity + 1, 99, available);

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

  await touchCart(supabase, cart.id);

  revalidatePath("/cart");
}

export async function updateCartQuantity(itemId: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error("Quantity must be between 1 and 99.");
  }

  const { supabase } = await getCurrentPublicUserId();

  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select("cart_id, product_id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    throw new Error("Unable to load this cart item.");
  }

  const { data: inventory } = await supabase
    .from("inventory")
    .select("quantity, reserved_quantity, is_active")
    .eq("product_id", item.product_id)
    .maybeSingle();

  const available = inventory?.is_active
    ? Math.max(0, Number(inventory.quantity ?? 0) - Number(inventory.reserved_quantity ?? 0))
    : 0;

  if (quantity > available) {
    throw new Error(
      available > 0
        ? `Only ${available} unit${available === 1 ? "" : "s"} are currently available.`
        : "This product is currently out of stock."
    );
  }

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

  await touchCart(supabase, item.cart_id);

  revalidatePath("/cart");
}

export async function removeCartItem(itemId: number) {
  const { supabase } = await getCurrentPublicUserId();

  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    throw new Error("Unable to load this cart item.");
  }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error("Unable to remove this item.");
  }

  await touchCart(supabase, item.cart_id);

  revalidatePath("/cart");
}
