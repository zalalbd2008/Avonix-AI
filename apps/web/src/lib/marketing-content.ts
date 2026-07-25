/**
 * Marketing copy in one file, so the pages stay layout and the words stay
 * editable without reading JSX.
 *
 * The prototype's copy was written for "Nexus", a website-operations product.
 * ADR-001 retired that positioning, so this is the same structure carrying the
 * category the product is actually in: an agency CRM for WordPress shops.
 */

export const HERO = {
  badge: "Agency CRM",
  title: ["One dashboard for", "every client's leads"],
  subtitle:
    "A GoHighLevel alternative built for agencies that work in WordPress. Keep the sites you already build — add the CRM layer on top.",
  primary: "Start free",
  secondary: "Sign in",
};

export const FEATURES = [
  {
    title: "One inbox, every client",
    body: "Form submissions and chat from all your clients' sites land in a single list, with unanswered threads at the top.",
  },
  {
    title: "Keep your WordPress sites",
    body: "A connector plugin, not a rebuild. GoHighLevel wants you off WordPress; we add the missing layer instead.",
  },
  {
    title: "AI that answers from their site",
    body: "The chat widget reads the client's own pages. It says when it doesn't know, and asks for a name and email instead of guessing.",
  },
  {
    title: "Contacts, not duplicates",
    body: "One person filling forms on three of a client's sites is one contact with three touchpoints.",
  },
  {
    title: "A pipeline per client",
    body: "Drag leads from New to Won. Nothing captured sits in a list nobody looks at.",
  },
  {
    title: "Two-way by email",
    body: "Reply from the dashboard and it reaches them. Their answer comes back into the same thread.",
  },
];

export const HOW_IT_WORKS = [
  { step: "1", title: "Add a client", body: "One business you work for. Their sites, contacts and pipeline live inside it." },
  { step: "2", title: "Install the connector", body: "One WordPress plugin, one key. Forms and the chat widget start reporting in." },
  { step: "3", title: "Work the leads", body: "Everything arrives in one inbox. Reply, qualify, move them along." },
];

export const TIERS = [
  {
    name: "Starter",
    price: "$29",
    sub: "One client site to get going",
    items: ["1 client", "1 website", "100 AI replies a month", "Full CRM and inbox"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$79",
    sub: "Growing agencies",
    items: ["5 clients", "25 websites", "5,000 AI replies a month", "API access"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Agency",
    price: "$149",
    sub: "Multi-client at scale",
    items: ["10 clients", "50 websites", "White-label", "50,000 AI replies a month"],
    cta: "Get started",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "Custom limits & MSA",
    items: ["Unlimited clients & sites", "Custom AI credits", "Dedicated support", "Custom integrations"],
    cta: "Talk to us",
    highlight: false,
  },
];

/**
 * Prices are deliberately unset — ADR-003 defers them until ten paying
 * customers. Saying "coming soon" is honest; inventing a number to fill the
 * card is not.
 */
export const PRICING_NOTE =
  "Free is available now. Paid plans are being priced with our first customers — tell us what you'd pay.";

export const DOCS = [
  { title: "Getting started", body: "Create an agency, add your first client, and connect a site in about ten minutes." },
  { title: "Installing the connector", body: "Upload the plugin, paste the key, enable the form and chat widget." },
  { title: "How the AI answers", body: "What gets indexed, how retrieval works, and why it refuses to guess." },
  { title: "Inbox and replies", body: "Replying by email, what happens to the visitor's answer, and closing threads." },
  { title: "Pipelines", body: "Stages, moving contacts, and what 'not placed' means." },
  { title: "Billing", body: "Plans, limits, and managing your subscription." },
];

export const POSTS = [
  { tag: "Product", date: "July 2026", title: "Why the inbox is the product, not the funnel builder" },
  { tag: "Engineering", date: "July 2026", title: "Tenant isolation you can actually test" },
  { tag: "Company", date: "July 2026", title: "Building an agency CRM for the WordPress world" },
];
