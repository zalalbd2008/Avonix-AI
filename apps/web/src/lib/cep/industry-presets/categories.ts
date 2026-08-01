import type { IndustryCategory, IndustryCategoryMeta } from "./types";

/** Scalable category architecture (current + future slots). */
export const INDUSTRY_CATEGORIES: IndustryCategoryMeta[] = [
  { id: "healthcare", label: "Healthcare", blurb: "Clinics, hospitals, specialty care" },
  { id: "dental", label: "Dental Specialties", blurb: "Cosmetic, implants, pediatric, surgery" },
  { id: "creative", label: "Creative & Branding", blurb: "Logo, identity, print, packaging" },
  { id: "web_digital", label: "Web & Digital", blurb: "Web, SEO, ads, social, GBP" },
  { id: "home_services", label: "Home Services", blurb: "Roofing, HVAC, plumbing, and more" },
  { id: "professional", label: "Professional Services", blurb: "Legal, finance, real estate, IT" },
  { id: "beauty", label: "Beauty", blurb: "Coming soon" },
  { id: "legal", label: "Legal", blurb: "Coming soon — use Professional → Law Firm" },
  { id: "financial", label: "Financial", blurb: "Coming soon" },
  { id: "construction", label: "Construction", blurb: "Coming soon" },
  { id: "automotive", label: "Automotive", blurb: "Coming soon" },
  { id: "hospitality", label: "Hospitality", blurb: "Coming soon" },
  { id: "education", label: "Education", blurb: "Coming soon" },
  { id: "fitness", label: "Fitness", blurb: "Coming soon" },
  { id: "ecommerce", label: "Ecommerce", blurb: "Coming soon" },
  { id: "saas", label: "SaaS", blurb: "Coming soon" },
  { id: "technology", label: "Technology", blurb: "Coming soon" },
  { id: "enterprise", label: "Enterprise", blurb: "Coming soon" },
];

export const ACTIVE_CATEGORIES: IndustryCategory[] = [
  "healthcare",
  "dental",
  "creative",
  "web_digital",
  "home_services",
  "professional",
];
