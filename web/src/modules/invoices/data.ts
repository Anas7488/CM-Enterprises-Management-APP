// ─── Company / Seller Info (used across all invoices) ──────────────────────
export const COMPANY = {
  name: "C M ENTERPRISES",
  address: [
    "NO. 351/C, BHUVANESHWARI NAGAR,",
    "VADARAJA STREET, R T NAGAR POST,",
    "BANGALORE,",
    "KARNATAKA - 560032",
  ],
  gstin: "29BIYPB2437F1Z1",
  stateName: "Karnataka",
  stateCode: "29",
  contact: "8722226811",
  email: "cmenterprises.office@gmail.com",
  bank: {
    name: "AXIS BANK A/C",
    accountNo: "922020049764502",
    branchIfsc: "SULTAN PALYA & UTIB0003200",
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────
export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "void";

export interface InvoiceLineItem {
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;        // "PCS", "LTR", "KG", etc.
  rate: number;        // per-unit rate
  discountPct: number; // e.g. 50 means 50%
  amount: number;      // after discount
}

export interface BuyerInfo {
  code: string;        // area code like "04"
  name: string;        // shop name
  address: string[];   // multi-line address
  gstin: string;
  stateName: string;
  stateCode: string;
  contact: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;               // ISO date
  dueDate: string;

  buyer: BuyerInfo;
  orderRef: string | null;

  items: InvoiceLineItem[];

  subtotal: number;           // sum of line item amounts (pre-tax)
  cgstRate: number;           // e.g. 9
  cgstAmount: number;
  sgstRate: number;           // e.g. 9
  sgstAmount: number;
  roundOff: number;           // positive or negative rounding
  totalAmount: number;        // grand total

  status: InvoiceStatus;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const absNum = Math.abs(Math.round(num * 100)); // work in paise
  const rupees = Math.floor(absNum / 100);
  const paise = absNum % 100;

  let result = "";
  if (rupees >= 10000000) {
    result += twoDigitWords(Math.floor(rupees / 10000000)) + " Crore ";
    const rem = rupees % 10000000;
    if (rem >= 100000) result += twoDigitWords(Math.floor(rem / 100000)) + " Lakh ";
    const rem2 = rem % 100000;
    if (rem2 >= 1000) result += twoDigitWords(Math.floor(rem2 / 1000)) + " Thousand ";
    const rem3 = rem2 % 1000;
    if (rem3 >= 100) result += ones[Math.floor(rem3 / 100)] + " Hundred ";
    const rem4 = rem3 % 100;
    if (rem4 > 0) result += twoDigitWords(rem4) + " ";
  } else if (rupees >= 100000) {
    result += twoDigitWords(Math.floor(rupees / 100000)) + " Lakh ";
    const rem = rupees % 100000;
    if (rem >= 1000) result += twoDigitWords(Math.floor(rem / 1000)) + " Thousand ";
    const rem2 = rem % 1000;
    if (rem2 >= 100) result += ones[Math.floor(rem2 / 100)] + " Hundred ";
    const rem3 = rem2 % 100;
    if (rem3 > 0) result += twoDigitWords(rem3) + " ";
  } else if (rupees >= 1000) {
    result += twoDigitWords(Math.floor(rupees / 1000)) + " Thousand ";
    const rem = rupees % 1000;
    if (rem >= 100) result += ones[Math.floor(rem / 100)] + " Hundred ";
    const rem2 = rem % 100;
    if (rem2 > 0) result += twoDigitWords(rem2) + " ";
  } else if (rupees >= 100) {
    result += ones[Math.floor(rupees / 100)] + " Hundred ";
    const rem = rupees % 100;
    if (rem > 0) result += twoDigitWords(rem) + " ";
  } else {
    result += twoDigitWords(rupees) + " ";
  }

  result = "INR " + result.trim();
  if (paise > 0) {
    result += " and " + twoDigitWords(paise) + " Paise";
  }
  result += " Only";
  return result;
}

export function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateFormal(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
}

// ─── Mock Data ─────────────────────────────────────────────────────────────
// TODO: Replace with real API calls — GET /api/invoices
export const MOCK_INVOICES: Invoice[] = [
  {
    id: "1",
    invoiceNo: "429",
    date: "2026-06-30",
    dueDate: "2026-07-28",
    buyer: {
      code: "04",
      name: "VINAYAKA HARDWARE (NGD)",
      address: ["KEMPEGOWGA BUILDING", "M G S ROAD", "NANJANGUD"],
      gstin: "29AMCPK7357E1ZW",
      stateName: "Karnataka",
      stateCode: "29",
      contact: "9448923323",
    },
    orderRef: null,
    items: [
      { description: "12 DUAL PRIMER 20 LTRS.", hsnSac: "3209", quantity: 3, unit: "PCS", rate: 1264.00, discountPct: 50, amount: 1896.00 },
      { description: "05-1LTR WOOD PRIMER", hsnSac: "3209", quantity: 12, unit: "PCS", rate: 145.00, discountPct: 50, amount: 870.00 },
      { description: "LEAK STOP 1LTR", hsnSac: "3824", quantity: 20, unit: "PCS", rate: 80.00, discountPct: 35, amount: 1040.00 },
    ],
    subtotal: 3806.00,
    cgstRate: 9,
    cgstAmount: 342.54,
    sgstRate: 9,
    sgstAmount: 342.54,
    roundOff: -0.08,
    totalAmount: 4491.00,
    status: "unpaid",
  },
  {
    id: "2",
    invoiceNo: "428",
    date: "2026-06-28",
    dueDate: "2026-07-26",
    buyer: {
      code: "06",
      name: "RAJ HARDWARE",
      address: ["SHOP NO. 12, MAIN ROAD", "SHIVAJI NAGAR", "PUNE"],
      gstin: "27AAHFR1234P1Z5",
      stateName: "Maharashtra",
      stateCode: "27",
      contact: "9876543210",
    },
    orderRef: "ORD-1102",
    items: [
      { description: "ARTIST GOLD PREMIUM EMULSION 20L", hsnSac: "3209", quantity: 20, unit: "PCS", rate: 1400.00, discountPct: 0, amount: 28000.00 },
      { description: "PRIMER RED OXIDE 20L", hsnSac: "3209", quantity: 10, unit: "PCS", rate: 2000.00, discountPct: 0, amount: 20000.00 },
    ],
    subtotal: 48000.00,
    cgstRate: 9,
    cgstAmount: 4320.00,
    sgstRate: 9,
    sgstAmount: 4320.00,
    roundOff: 0,
    totalAmount: 56640.00,
    status: "unpaid",
  },
  {
    id: "3",
    invoiceNo: "425",
    date: "2026-06-22",
    dueDate: "2026-07-20",
    buyer: {
      code: "09",
      name: "KRISHNA PAINTS",
      address: ["NEAR BUS STAND", "COLLEGE ROAD", "NASHIK"],
      gstin: "27BBHKP9988Q1Z2",
      stateName: "Maharashtra",
      stateCode: "27",
      contact: "9812345670",
    },
    orderRef: "ORD-1098",
    items: [
      { description: "ARTIST GOLD EXTERIOR PAINT 10L", hsnSac: "3209", quantity: 25, unit: "PCS", rate: 1400.00, discountPct: 0, amount: 35000.00 },
    ],
    subtotal: 35000.00,
    cgstRate: 9,
    cgstAmount: 3150.00,
    sgstRate: 9,
    sgstAmount: 3150.00,
    roundOff: 0,
    totalAmount: 41300.00,
    status: "partially_paid",
  },
  {
    id: "4",
    invoiceNo: "420",
    date: "2026-06-18",
    dueDate: "2026-07-03",
    buyer: {
      code: "02",
      name: "METRO HARDWARE",
      address: ["45/A, INDUSTRIAL AREA", "YESHWANTHPUR", "BANGALORE"],
      gstin: "29CDFMT5566R1Z8",
      stateName: "Karnataka",
      stateCode: "29",
      contact: "9900112233",
    },
    orderRef: "ORD-1090",
    items: [
      { description: "SYNTHETIC ENAMEL WHITE 4L", hsnSac: "3208", quantity: 30, unit: "PCS", rate: 1200.00, discountPct: 0, amount: 36000.00 },
      { description: "DISTEMPER POWDER 50KG", hsnSac: "3206", quantity: 20, unit: "PCS", rate: 1300.00, discountPct: 0, amount: 26000.00 },
    ],
    subtotal: 62000.00,
    cgstRate: 9,
    cgstAmount: 5580.00,
    sgstRate: 9,
    sgstAmount: 5580.00,
    roundOff: 0,
    totalAmount: 73160.00,
    status: "unpaid",
  },
  {
    id: "5",
    invoiceNo: "415",
    date: "2026-06-10",
    dueDate: "2026-07-10",
    buyer: {
      code: "11",
      name: "PATEL STORES",
      address: ["SHOP NO 7, MARKET YARD", "SOLAPUR ROAD", "SOLAPUR"],
      gstin: "27EEGPS4433T1Z1",
      stateName: "Maharashtra",
      stateCode: "27",
      contact: "9988776655",
    },
    orderRef: null,
    items: [
      { description: "ARTIST GOLD PREMIUM EMULSION 20L", hsnSac: "3209", quantity: 10, unit: "PCS", rate: 1400.00, discountPct: 0, amount: 14000.00 },
      { description: "CLEAR VARNISH 1L", hsnSac: "3205", quantity: 15, unit: "PCS", rate: 300.00, discountPct: 0, amount: 4500.00 },
    ],
    subtotal: 18500.00,
    cgstRate: 9,
    cgstAmount: 1665.00,
    sgstRate: 9,
    sgstAmount: 1665.00,
    roundOff: 0,
    totalAmount: 21830.00,
    status: "paid",
  },
  {
    id: "6",
    invoiceNo: "408",
    date: "2026-05-28",
    dueDate: "2026-06-25",
    buyer: {
      code: "03",
      name: "SHREE COLORS",
      address: ["22, TILAK ROAD", "NEAR TEMPLE", "HUBLI"],
      gstin: "29FFGSC7722U1Z3",
      stateName: "Karnataka",
      stateCode: "29",
      contact: "9845678901",
    },
    orderRef: "ORD-1078",
    items: [
      { description: "ARTIST GOLD PREMIUM EMULSION 20L", hsnSac: "3209", quantity: 30, unit: "PCS", rate: 1400.00, discountPct: 0, amount: 42000.00 },
      { description: "ARTIST GOLD EXTERIOR PAINT 10L", hsnSac: "3209", quantity: 15, unit: "PCS", rate: 1400.00, discountPct: 0, amount: 21000.00 },
      { description: "TEXTURE FINISH 20L", hsnSac: "3214", quantity: 5, unit: "PCS", rate: 1800.00, discountPct: 0, amount: 9000.00 },
    ],
    subtotal: 72000.00,
    cgstRate: 9,
    cgstAmount: 6480.00,
    sgstRate: 9,
    sgstAmount: 6480.00,
    roundOff: 0,
    totalAmount: 84960.00,
    status: "partially_paid",
  },
  {
    id: "7",
    invoiceNo: "400",
    date: "2026-05-12",
    dueDate: "2026-06-09",
    buyer: {
      code: "06",
      name: "RAJ HARDWARE",
      address: ["SHOP NO. 12, MAIN ROAD", "SHIVAJI NAGAR", "PUNE"],
      gstin: "27AAHFR1234P1Z5",
      stateName: "Maharashtra",
      stateCode: "27",
      contact: "9876543210",
    },
    orderRef: "ORD-1065",
    items: [
      { description: "PRIMER RED OXIDE 20L", hsnSac: "3209", quantity: 10, unit: "PCS", rate: 2000.00, discountPct: 0, amount: 20000.00 },
      { description: "RUST GUARD 4L", hsnSac: "3210", quantity: 5, unit: "PCS", rate: 1000.00, discountPct: 0, amount: 5000.00 },
    ],
    subtotal: 25000.00,
    cgstRate: 9,
    cgstAmount: 2250.00,
    sgstRate: 9,
    sgstAmount: 2250.00,
    roundOff: 0,
    totalAmount: 29500.00,
    status: "paid",
  },
  {
    id: "8",
    invoiceNo: "395",
    date: "2026-05-05",
    dueDate: "2026-06-02",
    buyer: {
      code: "02",
      name: "METRO HARDWARE",
      address: ["45/A, INDUSTRIAL AREA", "YESHWANTHPUR", "BANGALORE"],
      gstin: "29CDFMT5566R1Z8",
      stateName: "Karnataka",
      stateCode: "29",
      contact: "9900112233",
    },
    orderRef: null,
    items: [
      { description: "DISTEMPER POWDER 50KG", hsnSac: "3206", quantity: 10, unit: "PCS", rate: 1500.00, discountPct: 0, amount: 15000.00 },
    ],
    subtotal: 15000.00,
    cgstRate: 9,
    cgstAmount: 1350.00,
    sgstRate: 9,
    sgstAmount: 1350.00,
    roundOff: 0,
    totalAmount: 17700.00,
    status: "void",
  },
];
