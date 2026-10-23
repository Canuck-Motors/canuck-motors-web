"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/account/actions";

export type ProfileValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  whatsapp_opt_in: boolean;
  address: { line1: string; line2: string; city: string; province: string; postal_code: string };
};

const PROVINCES: [string, string][] = [
  ["AB", "Alberta"],
  ["BC", "British Columbia"],
  ["MB", "Manitoba"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"],
  ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"],
  ["NU", "Nunavut"],
  ["ON", "Ontario"],
  ["PE", "Prince Edward Island"],
  ["QC", "Quebec"],
  ["SK", "Saskatchewan"],
  ["YT", "Yukon"],
];

const input =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60";

export default function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, null);
  const a = values.address;

  return (
    <form action={action} className="mt-6 space-y-8">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-ink">Your details</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="first_name">First name</label>
            <input id="first_name" name="first_name" defaultValue={values.first_name} required autoComplete="given-name" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="last_name">Last name</label>
            <input id="last_name" name="last_name" defaultValue={values.last_name} autoComplete="family-name" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" value={values.email} disabled readOnly className={`${input} cursor-not-allowed bg-secondary text-ink/50`} />
          </div>
          <div>
            <label className={label} htmlFor="phone_number">Phone</label>
            <input id="phone_number" name="phone_number" type="tel" defaultValue={values.phone_number} placeholder="+1 416 555 0123" autoComplete="tel" className={input} />
          </div>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <input name="whatsapp_opt_in" type="checkbox" defaultChecked={values.whatsapp_opt_in} className="mt-1" />
          <span>Send WhatsApp order and delivery updates.</span>
        </label>
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-ink">Delivery address</h3>
        <p className="mt-1 text-sm text-muted-foreground">We deliver within Canada. Leave it all empty to remove your saved address.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="line1">Street address</label>
            <input id="line1" name="line1" defaultValue={a.line1} autoComplete="address-line1" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="line2">Apartment, suite, unit (optional)</label>
            <input id="line2" name="line2" defaultValue={a.line2} autoComplete="address-line2" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="city">City</label>
            <input id="city" name="city" defaultValue={a.city} autoComplete="address-level2" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="province">Province</label>
            <select id="province" name="province" defaultValue={a.province} autoComplete="address-level1" className={input}>
              <option value="">Select province</option>
              {PROVINCES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="postal_code">Postal code</label>
            <input id="postal_code" name="postal_code" defaultValue={a.postal_code} placeholder="M5V 2T6" autoComplete="postal-code" maxLength={10} className={`${input} uppercase`} />
          </div>
          <div>
            <label className={label} htmlFor="country">Country</label>
            <input id="country" value="Canada" disabled readOnly className={`${input} cursor-not-allowed bg-secondary text-ink/50`} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="cm-button-dark min-w-40 disabled:opacity-60">
          {pending ? "Saving..." : "Save changes"}
        </button>
        {state && (
          <p role="status" className={`text-sm font-semibold ${state.ok ? "text-green-700" : "text-brand"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
