// Blog posts moved over from the old Canuck Motors site.
// The article text lives in content/blog/<slug>.html and the pictures in public/blog/<slug>/.
export type BlogPost = {
  slug: string;
  title: string; // browser / search title
  heading: string; // the article's main heading
  description: string;
  excerpt: string;
  cover: string;
  // Only set for posts written in /admin/blog (the older ones are files in content/blog)
  bodyHtml?: string;
  photos?: { url: string; source: string; credit: string; creditUrl: string; pageUrl: string }[];
  faq?: { q: string; a: string }[];
  sources?: { title: string; url: string }[];
  publishedAt?: string;
  updatedAt?: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ford-f150-water-pump-replacement-guide",
    title: "A Guide to Ford F-150 Water Pump Replacement",
    heading: "Is It Time to Replace the Water Pump in Your Ford F-150? A Mileage-Based Guide",
    description: "Is your F-150 due for a water pump change? Discover mileage tips, warning signs, and why Canadian-owned Canuck Motors is your trusted source for reliable replacements.",
    excerpt: "Is your F-150 due for a water pump change? Discover mileage tips, warning signs, and why Canadian-owned Canuck Motors is your trusted source for reliable replacements.",
    cover: "/blog/ford-f150-water-pump-replacement-guide/1.png",
  },
  {
    slug: "water-pump-maintenance-tips-toyota-corolla-canada",
    title: "Water Pump Maintenance Tips for Toyota Corolla in Canada",
    heading: "Avoid Costly Repairs: Water Pump Maintenance Guide for Your Toyota Corolla in Canada",
    description: "Learn how to maintain, remove, and replace your Toyota Corolla water pump in Canada. Expert tips from Canuck Motors, a proudly Canadian water pump brand.",
    excerpt: "Learn how to maintain, remove, and replace your Toyota Corolla water pump in Canada. Expert tips from Canuck Motors, a proudly Canadian water pump brand.",
    cover: "/blog/water-pump-maintenance-tips-toyota-corolla-canada/1.png",
  },
  {
    slug: "why-canuck-motors-leads-canadas-auto-parts-revolution",
    title: "Why Canuck Motors Leads Canada's Auto Parts Revolution",
    heading: "Redefining the Auto Parts Industry: Why Canuck Motors Stands Out in a Competitive Market",
    description: "Explore how Canuck Motors is redefining Canada's auto parts industry with innovative, sustainable, and customer-focused water pump solutions.",
    excerpt: "Explore how Canuck Motors is redefining Canada's auto parts industry with innovative, sustainable, and customer-focused water pump solutions.",
    cover: "/blog/why-canuck-motors-leads-canadas-auto-parts-revolution/1.png",
  },
  {
    slug: "canada-day-2025-support-canadian-business-with-canuck-motors",
    title: "Canada Day 2025– Support Canadian Business with Canuck Motors",
    heading: "Canada Day 2025: A Time to Reflect, Celebrate, and Support Canadian Business",
    description: "Celebrate Canada Day by supporting Canadian businesses. See how Canuck Motors proudly contributes to the economy of Canada by supporting local businesses.",
    excerpt: "Discover why supporting Canadian businesses like Canuck Motors matters this Canada Day. Learn our story, values, and how you can help build a stronger, self-reliant Canada.",
    cover: "/blog/canada-day-2025-support-canadian-business-with-canuck-motors/canada-day-1-copy-1.webp",
  },
  {
    slug: "2014-ram-1500-water-pump-problems-and-solutions",
    title: "2014 Ram 1500 Water Pump Problems and Solutions",
    heading: "Beginner’s Guide: How to Identify a Failing Water Pump in Your 2014 Dodge Ram 1500 5.7 HEMI Engine",
    description: "Understand how to spot water pump failure in your 2014 Ram 1500 5.7 HEMI. Get maintenance tips, diagnosis help, and expert advice from Canauk Motors.",
    excerpt: "Learn how to spot water pump failure in your 2014 Ram 1500 5.7 HEMI, get maintenance tips, and expert advice from Canuck Motors for reliable Canadian-sourced parts.",
    cover: "/blog/2014-ram-1500-water-pump-problems-and-solutions/identify-water-pump-leak-1-copy.webp",
  },
  {
    slug: "learn-the-signs-you-need-to-replace-the-car-water-pump",
    title: "Learn the Signs You Need to Replace the Car Water Pump",
    heading: "Is Your Car's Water Pump Failing? 6 Critical Signs You Can't Ignore!",
    description: "This blog will guide you through the signs to understand whether you need to replace your car water pump. Call Canuck Motors for top-quality water pumps online.",
    excerpt: "Learn the warning signs of a failing car water pump and why timely replacement is crucial. Canuck Motors offers high-quality water pumps and auto parts in Canada.",
    cover: "/blog/learn-the-signs-you-need-to-replace-the-car-water-pump/water-pump-failing-1.jpg",
  },
  {
    slug: "understand-the-role-of-seal-and-gaskets-for-car-water-pump",
    title: "Understand the Role of Seal and Gaskets for Car Water Pump",
    heading: "Role of Top-Quality Seals and Gaskets in Water Pumps: Crucial Elements for Performance & Longevity",
    description: "Here, we have mentioned the importance of seals and gaskets for well-performing water pumps. Contact Canuck Motors, an auto part store in Canada, for your needs.",
    excerpt: "Discover why top-quality seals and gaskets are crucial for water pump performance and longevity. Learn how Canuck Motors ensures reliability for Canadian drivers.",
    cover: "/blog/understand-the-role-of-seal-and-gaskets-for-car-water-pump/canuckmotors-1.webp",
  },
  {
    slug: "shop-premium-canadian-auto-parts-online-canuck-motors-now-available-on-amazon",
    title: "Shop Premium Canadian Auto Parts Online: Canuck Motors Now Available on Amazon",
    heading: "Canuck Motors Expands Reach: Introducing Our Auto Parts on Amazon for Convenient Online Shopping",
    description: "Canuck Motors brings top-quality auto parts to Amazon. Designed for Canadian roads, you can now shop for reliable water pumps easily online.",
    excerpt: "Canuck Motors launches its premium auto parts on Amazon for convenient online shopping. Discover high-quality water pumps and more, engineered for Canadian roads.",
    cover: "/blog/shop-premium-canadian-auto-parts-online-canuck-motors-now-available-on-amazon/canuck-1.webp",
  },
  {
    slug: "learn-early-signs-on-how-to-spot-a-leaking-car-water-pump",
    title: "Learn Early Signs on How to Spot a Leaking Car Water Pump",
    heading: "How to Spot a Leaking Car Water Pump Before Serious Engine Damage Happens",
    description: "Learn the tips to identify a leaking car water pump before it causes severe engine damage. Discover signs, smells, and maintenance tips from Canuck Motors today!",
    excerpt: "Learn the tips to identify a leaking car water pump before it causes severe engine damage. Discover signs, smells, and maintenance tips from Canuck Motors today!",
    cover: "/blog/learn-early-signs-on-how-to-spot-a-leaking-car-water-pump/1.png",
  },
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
