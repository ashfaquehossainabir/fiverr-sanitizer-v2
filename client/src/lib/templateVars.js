import { formatDay } from "./dates.js";

// Templates use {{placeholder}} syntax, e.g. "Hi {{client}}, your {{project}} is ready."
const VAR_REGEX = /\{\{\s*([a-zA-Z][\w ]{0,30}?)\s*\}\}/g;

export function extractVariables(body) {
  const found = [];
  (body || "").replace(VAR_REGEX, (_, name) => {
    const key = name.trim();
    if (!found.includes(key)) found.push(key);
    return _;
  });
  return found;
}

export function fillTemplate(body, values) {
  return (body || "").replace(VAR_REGEX, (match, name) => {
    const v = values[name.trim()];
    return v && v.trim() ? v : match;
  });
}

// formatDay resolves the stored value to the calendar day the user picked in any timezone.
const formatDeadline = (d) => formatDay(d, { month: "long", day: "numeric" });

// Pre-fills well-known placeholders ({{client}}, {{project}}, {{deadline}}) from the
// client the message is linked to, so most templates need zero typing.
export function autoFillValues(vars, client) {
  const out = {};
  vars.forEach((v) => {
    const key = v.toLowerCase();
    let value = "";
    if (client) {
      if (["client", "name", "buyer", "customer"].includes(key)) value = client.name || "";
      else if (["project", "order", "gig"].includes(key)) value = client.project || "";
      else if (["deadline", "date", "delivery date", "due date"].includes(key)) value = formatDeadline(client.deadline);
    }
    out[v] = value;
  });
  return out;
}

export const STARTER_TEMPLATES = [
  {
    title: "Greeting + project kickoff",
    category: "Onboarding",
    body: "Hi {{client}}, thank you for placing your order! I am excited to start working on {{project}}. To get going, could you please share any references or details you would like me to follow? I will send the first draft by {{deadline}}."
  },
  {
    title: "Progress update",
    category: "Updates",
    body: "Hi {{client}}, quick update on {{project}}: the work is moving well and I am on track for {{deadline}}. Please let me know if you would like to change anything before I continue."
  },
  {
    title: "Delivery message",
    category: "Delivery",
    body: "Hi {{client}}, your {{project}} is ready! I have attached everything for you to look over. Please let me know if you would like any adjustments, and I will be happy to help."
  },
  {
    title: "Polite follow-up",
    category: "Follow-up",
    body: "Hi {{client}}, I hope you are doing well. I wanted to gently follow up on {{project}}. Could you please let me know when you have a moment? Thank you for your time."
  },
  {
    title: "Revision request received",
    category: "Revisions",
    body: "Hi {{client}}, thank you for the notes on {{project}}. I understand the changes and will have the updated version ready by {{deadline}}. Please tell me if anything else comes to mind."
  },
  {
    title: "Delay notice",
    category: "Updates",
    body: "Hi {{client}}, I want to be upfront: {{project}} needs a little more time than planned. The new delivery date is {{deadline}}. Thank you for your patience and understanding."
  }
];
