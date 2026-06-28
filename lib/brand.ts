export const brand = {
  name: "Uggalla Oil Mills",
  shortName: "Uggalla",
  tagline: "Pure, Natural Oils from Padukka, Sri Lanka",
  phone: "+94 77 XXX XXXX",
  whatsapp: "+94 77 XXX XXXX",
  email: "hello@uggallaoilmills.lk",
  address: "No. 196/B, Mawathagama, Padukka, Sri Lanka",
  // Direct Google Maps link to the shop's pin — used by "open in Maps" actions
  // (e.g. the clickable footer address). Paste the shop's share link here (Google
  // Maps → Share → "Copy link"). Leave blank to fall back to an address search.
  googleMapsUrl: "https://maps.app.goo.gl/AKYg5Sxx9M1qauGQ8",
  // Google Maps embed for the Contact page — the shop's pin (no API key needed).
  // To change it: open the location in Google Maps → Share → "Embed a map" → paste
  // the URL from the iframe's src="" here. Leave blank to derive from `address`.
  googleMapsEmbedUrl:
    "https://www.google.com/maps?q=Uggalla+Oil+Mills,+Mawathagama,+Padukka+10500&output=embed",
  socials: {
    facebook: "https://www.facebook.com/people/Uggalla-oil-mills/61580270436829/",
    instagram: "",
    tiktok: "",
  },
  productBrand: "Royal Coco",
  currency: "LKR",
  currencySymbol: "Rs.",
  timezone: "Asia/Colombo",
  minLeadTimeHours: 24,
  freeDeliveryThreshold: 10000,
};

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
