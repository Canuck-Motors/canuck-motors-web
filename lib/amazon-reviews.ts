// Amazon.ca reviews shown on the home page ("What our customers say").
// To add one: copy an entry. `id` is the review ID from the Amazon review link
// (amazon.ca/gp/customer-reviews/<id>). If you only have the product page, use `url` instead.
// Only reviews with rating >= MIN_REVIEW_STARS are shown.

export type AmazonReview = {
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string; // YYYY-MM-DD
  type: "verified" | "vine";
  part: string;
  title: string;
  text: string;
  id?: string;
  url?: string;
};

export const MIN_REVIEW_STARS = 4;

const BRAKE_PADS_REVIEWS = "https://www.amazon.ca/product-reviews/B0GCND8MQF";

export const AMAZON_REVIEWS: AmazonReview[] = [
  { name: "Laura", rating: 5, date: "2026-07-21", type: "vine", part: "CM1253285 (Ford EcoBoost)",
    title: "Solid water pump replacement for the F150 V6",
    text: "Everything matched up to the factory mounting points cleanly and the installation went smoothly without any surprises.",
    id: "R174B9TK8U0NNU" },
  { name: "Carole ann", rating: 5, date: "2026-08-17", type: "verified", part: "CM1253265 (Ford EcoBoost)",
    title: "Bon produit bonne description",
    text: "Exactement la bonne pièce !! Je recommande de bonne qualité.",
    id: "R259TIK0HF9HI" },
  { name: "Trevor Bartel", rating: 4, date: "2026-02-20", type: "verified", part: "CM1253255",
    title: "Good product and fitment",
    text: "Good product, fits good. Exact replacement and fit",
    id: "R7X0IYJAI4D7R" },
  { name: "j", rating: 5, date: "2026-03-31", type: "verified", part: "CM1452510",
    title: "Perfect fit",
    text: "It fit perfectly, and did the job.",
    id: "RJMY6UD1UZGAD" },
  { name: "William Brownell", rating: 5, date: "2026-04-28", type: "verified", part: "CM1251670 (Ford Cologne/Vulcan/Windsor)",
    title: "Good quality !!!!!!",
    text: "Great product !!!!",
    id: "R1UZFG5IX3OFK0" },
  { name: "Customer", rating: 5, date: "2026-04-26", type: "vine", part: "CM1251670 (Ford Cologne/Vulcan/Windsor)",
    title: "Straightforward Install with Proper Alignment",
    text: "Once installed, it runs smoothly and restores proper coolant flow without leaks.",
    id: "R170T4XYMTHTS6" },
  { name: "Jared", rating: 4, date: "2026-03-11", type: "verified", part: "CM1255930",
    title: "Pretty Dec",
    text: "Arrived the next day! Only thing that's holdin me 5 Stars is the majority of the bolts with the wrong length and size 😳 otherwise it was perfect.",
    id: "RG96OVRCOUXZX" },
  { name: "Javaughn allen", rating: 5, date: "2026-03-20", type: "verified", part: "CM1253285 (Ford EcoBoost)",
    title: "Long lasting",
    text: "Fit well",
    id: "R1MG0BUSNSU1QQ" },
  { name: "Ralph L.", rating: 4, date: "2026-10-02", type: "verified", part: "CM1253300 (Ford EcoBoost)",
    title: "Good price",
    text: "Fair parts, gasket doesn't like what the original had. Good price tho",
    id: "R1N01YVDXXA1K" },
  { name: "David Bhagwan", rating: 5, date: "2025-08-29", type: "verified", part: "CM1253270",
    title: "Shipment arrived on time.",
    text: "The part fit exactly as required.",
    id: "R2CF0E7A920FTT" },

  // Brake pads: no single-review IDs yet, so these open the product's reviews page.
  { name: "Anass Ismaili", rating: 5, date: "2026-09-30", type: "verified", part: "CMK1084-967 Brake Pad Set",
    title: "Perfect fit for my ram 1500 classic 2021",
    text: "Perfect fit, easy to install, good quality and came with all the necessary parts needed for the installation. I will definitely buy them again in the future.",
    url: BRAKE_PADS_REVIEWS },
  { name: "Amazon Customer", rating: 5, date: "2026-09-09", type: "verified", part: "Ceramic Brake Pad Set",
    title: "Break pads as ordered",
    text: "Exactly what i ordered. Fit 2021 Dodge Ram.",
    url: BRAKE_PADS_REVIEWS },
  { name: "Steff", rating: 5, date: "2026-09-09", type: "verified", part: "Ceramic Brake Pad Set",
    title: "Plaquette de frein",
    text: "Compatible avec Jeep Cherokee trail hack 2020",
    url: BRAKE_PADS_REVIEWS },
  { name: "Jean Joseph Ronald Fournier", rating: 5, date: "2026-08-09", type: "verified", part: "Ceramic Brake Pad Set",
    title: "Canucks Motors",
    text: "They are extremely well done and fit great and I would highly recommend them to any one who wants a great job for brakes.",
    url: BRAKE_PADS_REVIEWS },
  { name: "Lee", rating: 5, date: "2026-08-11", type: "verified", part: "Ceramic Brake Pad Set",
    title: "Great",
    text: "Just installed them but so far they seem pretty decent",
    url: BRAKE_PADS_REVIEWS },
  { name: "Jeff Hall", rating: 5, date: "2026-06-14", type: "verified", part: "Ceramic Brake Pad Set",
    title: "Quick ship",
    text: "Parts fit as described. Included all retainer clips needed. Fast shipping. Very pleased.",
    url: BRAKE_PADS_REVIEWS },
];

export function reviewUrl(r: AmazonReview): string {
  return r.url ?? `https://www.amazon.ca/gp/customer-reviews/${r.id}`;
}

export function visibleReviews(): AmazonReview[] {
  return AMAZON_REVIEWS.filter((r) => r.rating >= MIN_REVIEW_STARS);
}
