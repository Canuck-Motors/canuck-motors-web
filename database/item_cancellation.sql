-- Cancel ONE item of a paid order (before it ships). Run once in the Supabase SQL editor.

alter table public.order_items add column if not exists cancelled_on timestamptz;
alter table public.order_items add column if not exists cancel_reason text;
alter table public.refunds add column if not exists order_item_id bigint;

-- 1) Customer asks to cancel one item. Returns what the server must refund in Stripe.
create or replace function public.prepare_item_cancellation(p_order_item_id bigint, p_reason text)
returns table(action text, refund_id uuid, payment_intent_id text, amount numeric, currency text, idempotency_key text, order_id uuid)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_refund public.refunds%rowtype;
  v_active int;
begin
  select * into v_item from public.order_items where id = p_order_item_id;
  if v_item.id is null then raise exception 'item_not_found'; end if;

  select * into v_order
  from public.orders
  where id = v_item.order_id
    and user_id = (select private.current_public_user_id())
  for update;
  if v_order.id is null then raise exception 'order_not_found'; end if;

  if v_item.cancelled_on is not null then raise exception 'item_already_cancelled'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'order_not_paid'; end if;
  if v_order.fulfillment_status not in ('unfulfilled','processing','packed') then
    raise exception 'order_already_in_delivery_flow';
  end if;
  if v_order.status in ('cancelled','refunded','cancellation_requested','refund_pending','exception') then
    raise exception 'order_not_cancellable';
  end if;

  select count(*) into v_active
  from public.order_items oi
  where oi.order_id = v_order.id and oi.cancelled_on is null;

  -- Last remaining item: the app cancels the whole order instead.
  if v_active <= 1 then
    return query select 'cancel_order'::text, null::uuid, null::text, null::numeric, null::text, null::text, v_order.id;
    return;
  end if;

  select * into v_payment
  from public.payments p
  where p.order_id = v_order.id and p.status = 'succeeded'
  order by p.paid_on desc nulls last, p.created_on desc
  limit 1;
  if v_payment.id is null or v_payment.provider_payment_intent_id is null then
    raise exception 'successful_payment_not_found';
  end if;

  select * into v_refund
  from public.refunds r
  where r.order_item_id = v_item.id and r.reason = 'item_cancellation' and r.status in ('pending','failed')
  order by r.created_on desc
  limit 1;

  if v_refund.id is null then
    insert into public.refunds(order_id, payment_id, idempotency_key, amount, currency, status, reason, order_item_id)
    values (v_order.id, v_payment.id,
            'cancel-item:' || v_item.id::text || ':' || extract(epoch from clock_timestamp())::bigint::text,
            v_item.line_total, v_order.currency, 'pending', 'item_cancellation', v_item.id)
    returning * into v_refund;
  end if;

  update public.order_items set cancel_reason = nullif(trim(p_reason), '') where id = v_item.id;

  return query select 'refund'::text, v_refund.id, v_payment.provider_payment_intent_id,
                      v_refund.amount, v_refund.currency, v_refund.idempotency_key, v_order.id;
end;
$function$;
grant execute on function public.prepare_item_cancellation(bigint, text) to authenticated;

-- 2) After Stripe answers: finish (or undo) the item cancellation. Server only.
create or replace function public.finalize_item_cancellation(
  p_refund_id uuid, p_stripe_refund_id text, p_succeeded boolean, p_failure_reason text default null
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_refund public.refunds%rowtype;
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
begin
  if current_user not in ('service_role','postgres') then raise exception 'not_authorized'; end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if v_refund.id is null then raise exception 'refund_not_found'; end if;
  if v_refund.reason <> 'item_cancellation' then raise exception 'wrong_refund_type'; end if;
  if v_refund.status = 'succeeded' then return; end if;

  if not p_succeeded then
    update public.refunds set status = 'failed', failure_reason = p_failure_reason, updated_on = now()
    where id = p_refund_id;
    return;
  end if;

  select * into v_item from public.order_items where id = v_refund.order_item_id for update;
  select * into v_order from public.orders where id = v_refund.order_id for update;

  update public.refunds
  set status = 'succeeded', stripe_refund_id = p_stripe_refund_id, updated_on = now()
  where id = p_refund_id;

  update public.order_items set cancelled_on = now() where id = v_item.id and cancelled_on is null;

  update public.orders
  set subtotal = greatest(0, subtotal - v_item.line_total),
      total_amount = greatest(0, total_amount - v_item.line_total),
      updated_on = now()
  where id = v_order.id;

  -- put the stock back
  update public.inventory i
  set quantity = i.quantity + v_item.quantity, updated_on = now()
  where i.product_id = v_item.product_id;

  insert into public.inventory_movements(product_id, order_id, quantity_delta, movement_type, reason)
  values (v_item.product_id, v_order.id, v_item.quantity, 'cancellation', 'Restocked after single item cancellation');

  insert into public.order_status_history(order_id, from_status, to_status, source, reason)
  values (v_order.id, v_order.status, v_order.status, 'customer',
          'Item cancelled and refunded: ' || v_item.sku || ' x' || v_item.quantity);
end;
$function$;

-- 3) Same as before, but full-order cancel must not restock items that were already cancelled.
create or replace function public.finalize_refund(p_refund_id uuid, p_stripe_refund_id text, p_succeeded boolean, p_failure_reason text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_refund public.refunds%rowtype;
  v_order public.orders%rowtype;
  v_total_refunded numeric;
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'not_authorized';
  end if;

  select * into v_refund from public.refunds where id=p_refund_id for update;
  if v_refund.id is null then raise exception 'refund_not_found'; end if;

  if v_refund.status='succeeded' and p_succeeded then
    return;
  end if;

  select * into v_order from public.orders where id=v_refund.order_id for update;

  if not p_succeeded then
    if v_refund.status='succeeded' then return; end if;

    update public.refunds
    set status='failed',failure_reason=p_failure_reason,updated_on=now()
    where id=p_refund_id;

    if v_refund.reason <> 'exchange_price_difference' then
      update public.orders set status='exception',updated_on=now()
      where id=v_refund.order_id;
    end if;
    return;
  end if;

  update public.refunds
  set status='succeeded',stripe_refund_id=p_stripe_refund_id,updated_on=now()
  where id=p_refund_id;

  select coalesce(sum(amount),0) into v_total_refunded
  from public.refunds
  where order_id=v_refund.order_id and status='succeeded';

  update public.orders
  set
    payment_status=case when v_total_refunded >= total_amount then 'refunded' else 'partially_refunded' end,
    status=case
      when v_refund.reason='exchange_price_difference' then status
      when v_refund.reason='customer_cancellation' and v_total_refunded >= total_amount then 'cancelled'
      when v_total_refunded >= total_amount then 'refunded'
      else 'partially_refunded'
    end,
    fulfillment_status=case
      when v_refund.reason='customer_cancellation' then 'cancelled'
      when v_refund.return_request_id is not null and v_refund.reason <> 'exchange_price_difference' then 'returned'
      else fulfillment_status
    end,
    cancelled_on=case when v_refund.reason='customer_cancellation' then coalesce(cancelled_on,now()) else cancelled_on end,
    updated_on=now()
  where id=v_refund.order_id;

  if v_refund.reason='customer_cancellation' then
    if not exists(
      select 1 from public.inventory_movements im
      where im.order_id=v_refund.order_id
        and im.movement_type='cancellation'
        and im.reason='Restocked after paid order cancellation'
    ) then
      update public.inventory i
      set quantity=i.quantity+oi.quantity,updated_on=now()
      from public.order_items oi
      where oi.order_id=v_refund.order_id and oi.product_id=i.product_id
        and oi.cancelled_on is null;

      insert into public.inventory_movements(product_id,order_id,quantity_delta,movement_type,reason)
      select oi.product_id,v_refund.order_id,oi.quantity,'cancellation','Restocked after paid order cancellation'
      from public.order_items oi
      where oi.order_id=v_refund.order_id and oi.cancelled_on is null;
    end if;

  elsif v_refund.reason='exchange_price_difference' then
    update public.return_requests
    set status='exchange_processing',updated_on=now()
    where id=v_refund.return_request_id;

  elsif v_refund.return_request_id is not null then
    if not exists(
      select 1 from public.inventory_movements im
      where im.order_id=v_refund.order_id
        and im.movement_type='return'
        and im.reason='Restocked after inspected customer return'
    ) then
      update public.inventory i
      set quantity=i.quantity+rri.received_quantity,updated_on=now()
      from public.return_request_items rri
      join public.order_items oi on oi.id=rri.order_item_id
      where rri.return_request_id=v_refund.return_request_id
        and rri.received_quantity > 0
        and oi.product_id=i.product_id;

      insert into public.inventory_movements(product_id,order_id,quantity_delta,movement_type,reason)
      select oi.product_id,v_refund.order_id,rri.received_quantity,'return','Restocked after inspected customer return'
      from public.return_request_items rri
      join public.order_items oi on oi.id=rri.order_item_id
      where rri.return_request_id=v_refund.return_request_id
        and rri.received_quantity > 0;
    end if;

    update public.return_requests
    set status='refunded',completed_on=now(),updated_on=now()
    where id=v_refund.return_request_id;
  end if;
end;
$function$;
