import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-black text-white">
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-3">

        <Link href="/products">
          Auto Parts
        </Link>

        <Link href="/categories">
          Categories
        </Link>

        <Link href="/brands">
          Brands
        </Link>

        <Link href="/deals">
          Deals
        </Link>

        <Link href="/about">
          About Us
        </Link>

      </div>
    </nav>
  );
}