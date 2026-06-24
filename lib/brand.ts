export const brand = {
  name: "Uggalla Oil Mills",
  shortName: "Uggalla",
  tagline: "Pure Coconut Oil from Padukka, Sri Lanka",
  phone: "+94 77 XXX XXXX",
  whatsapp: "+94 77 XXX XXXX",
  email: "hello@uggallaoilmills.lk",
  address: "No. 196/B, Mawathagama, Padukka, Sri Lanka",
  socials: {
    facebook: "",
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
