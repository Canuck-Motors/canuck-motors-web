"use client";

import { useRef, useState } from "react";

// Flies a copy of the product photo into the header cart, bumps the cart,
// then submits the real "add to cart" action. Purely visual: the button works
// the same without JavaScript, and the animation is skipped for people who
// prefer reduced motion.
export default function AddToCartButton({
  action,
  label = "Add to Cart",
}: {
  action: () => void | Promise<void>;
  label?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const ready = useRef(false);
  const [busy, setBusy] = useState(false);

  function fly() {
    const cart = document.querySelector<HTMLElement>("[data-cart-target]");
    const photo = document.querySelector<HTMLImageElement>("[data-product-image] img");
    const button = formRef.current?.querySelector("button");
    const from = (photo ?? button)?.getBoundingClientRect();
    if (!cart || !from) return 0;

    const to = cart.getBoundingClientRect();
    const size = Math.min(from.width, 160);
    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + to.height / 2 - size / 2;

    const ghost = document.createElement("div");
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${size}px`,
      height: `${size}px`,
      zIndex: "9999",
      pointerEvents: "none",
      borderRadius: "16px",
      background: photo?.src
        ? `#fff url("${photo.src}") center / contain no-repeat`
        : "hsl(var(--brand))",
      boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      border: "2px solid hsl(var(--brand))",
    });
    document.body.appendChild(ghost);

    const dx = endX - startX;
    const dy = endY - startY;
    const anim = ghost.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(0.6) rotate(-8deg)`,
          opacity: 1,
          offset: 0.5,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(12deg)`, opacity: 0.4 },
      ],
      { duration: 750, easing: "cubic-bezier(0.5, 0, 0.75, 0.4)", fill: "forwards" },
    );

    anim.onfinish = () => {
      ghost.remove();
      cart.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.25)" },
          { transform: "scale(0.95)" },
          { transform: "scale(1)" },
        ],
        { duration: 400, easing: "ease-out" },
      );
    };
    return 760;
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (ready.current) return; // the real submit, after the animation
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const wait = fly();
        if (!wait) return;

        e.preventDefault();
        setBusy(true);
        setTimeout(() => {
          ready.current = true;
          formRef.current?.requestSubmit();
        }, wait);
      }}
    >
      <button type="submit" disabled={busy} className="cm-button-primary disabled:opacity-80">
        {busy ? "Adding..." : label}
      </button>
    </form>
  );
}
