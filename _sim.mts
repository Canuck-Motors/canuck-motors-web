import { addNoteSpecs, narrow, questionText, notSureAboutEverything } from "@/lib/axel-narrow";

const mk = (id: number, name: string, position: string | null, notes: string[], fits: any[]) =>
  ({ id, product_name: name, sku: "CM" + id, price: 50, position, url: "/p/" + id, notes, fits }) as any;

function run(title: string, products: any[], answers: (string | null)[][], opts = {}) {
  console.log("\n=== " + title);
  const specs = new Map();
  addNoteSpecs(specs, products, opts);
  const filters: { name: string; value: string | null }[] = [];
  let step = 0;
  for (;;) {
    const r = narrow(products, specs, filters);
    console.log(`  candidates: ${r.candidates.map((p: any) => p.sku).join(",")}`);
    if (!r.question) {
      console.log(r.candidates.length === 1 ? "  -> RECOMMEND " + r.candidates[0].sku
        : r.candidates.length > 1 ? "  -> CANNOT CONFIRM (" + r.candidates.length + " left)" : "  -> none");
      return;
    }
    console.log("  Q: " + questionText(r.question, r.candidates.length) + "  [" + r.question.options.join(" / ") + "]");
    const a = answers[step++];
    if (!a) { console.log("  (no more answers)"); return; }
    filters.push({ name: r.question.name, value: a[0] });
    console.log("  A: " + a[0]);
  }
}

// 1. Brake pads: front/rear/kit + heavy duty
const brakes = [
  mk(1, "Pad F", "Front", ["Heavy Duty Brakes"], [{trim:"Base",engine:"3.5L V6",fuel:"gas",body:"Pickup"}]),
  mk(2, "Pad F std", "Front", [], [{trim:"Base",engine:"3.5L V6",fuel:"gas",body:"Pickup"}]),
  mk(3, "Pad R", "Rear", [], [{trim:"Base",engine:"3.5L V6",fuel:"gas",body:"Pickup"}]),
  mk(4, "Kit", "Front and Rear", [], [{trim:"Base",engine:"3.5L V6",fuel:"gas",body:"Pickup"}]),
];
run("brakes: front, then heavy duty yes", brakes, [["Front"],["Yes"]]);
run("brakes: not sure to everything", brakes, [["Front"],[null]]);

// 2. Water pumps differing by trim / body / note clause
const pumps = [
  mk(10, "Pump A", null, ["Built after 03/2012"], [{trim:"XL",engine:"5.0L V8",fuel:"gas",body:"Sedan"}]),
  mk(11, "Pump B", null, ["Built before 03/2012"], [{trim:"XL",engine:"5.0L V8",fuel:"gas",body:"Sedan"}]),
  mk(12, "Pump C", null, [], [{trim:"Lariat",engine:"5.0L V8",fuel:"gas",body:"Sedan"}]),
];
run("pumps: XL then built after", pumps, [["XL"],["Yes"]]);
run("pumps: not sure", pumps, [[null],[null],[null]]);

// 3. Engine unknown
const eng = [
  mk(20, "Pump 3.5", null, [], [{trim:"",engine:"3.5L V6",fuel:"gas",body:""}]),
  mk(21, "Pump 5.0", null, [], [{trim:"",engine:"5.0L V8",fuel:"gas",body:""}]),
];
run("engine unknown, picks 5.0", eng, [["5.0L V8"]], { includeEngine: true });
run("engine unknown, not sure", eng, [[null]], { includeEngine: true });

// 4. identical parts
const same = [mk(30,"X",null,[],[{trim:"",engine:"",fuel:"",body:""}]), mk(31,"Y",null,[],[{trim:"",engine:"",fuel:"",body:""}])];
run("identical parts (nothing to ask)", same, []);
