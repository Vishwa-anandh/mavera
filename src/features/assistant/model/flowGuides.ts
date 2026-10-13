export interface FlowGuide {
  key: string;
  /** Route prefix this guide applies to. */
  pathPrefix: string;
  /** The assistant's own proactive question, shown before any message is sent. */
  prompt: string;
  /** Suggestion chip text — also the "user" message sent when it's clicked. */
  chipLabel: string;
  /** Authored walkthrough returned instead of the generic no-live-model reply. */
  reply: string;
}

/**
 * Per-page walkthroughs the floating Assistant offers proactively. These are
 * authored guidance, not answers over live data, so they can be genuine
 * (unlike free-form questions, which still get the honest "no model
 * connected" reply — see useAssistantConversation).
 */
export const FLOW_GUIDES: FlowGuide[] = [
  {
    key: 'budgets',
    pathPrefix: '/budgets',
    prompt: 'Need a hand setting up a budget or alert on this page?',
    chipLabel: 'Help me create a budget',
    reply: [
      "Here's how to set up a budget:",
      '1. On the Budgets tab, give it a name.',
      '2. Choose a scope — Organization Wide covers every connected cloud account, or pick one specific account.',
      '3. Set the target amount and the alert threshold (e.g. 80% warns you before the cap).',
      '4. Click "Add Budget" — it appears in the list on the right immediately.',
      '5. Switch to Alert Integrations to add an email or Microsoft Teams channel for threshold notifications.',
    ].join('\n'),
  },
  {
    key: 'connect-cloud-account',
    pathPrefix: '/cloud/overview',
    prompt: 'Want help connecting a cloud account?',
    chipLabel: 'Help me connect a cloud account',
    reply: [
      "Here's how to connect a cloud account:",
      '1. Click "Connect a cloud account" above the cost summary.',
      '2. Pick the provider — Azure, AWS, SAP BTP or Google Cloud — and give the account a name.',
      "3. Enter that provider's credentials; Mavera validates them before saving, so you'll see an inline error right away if something's off.",
      '4. Once validated, click Save — the account shows up in your cost dashboards within moments.',
    ].join('\n'),
  },
  {
    key: 'billing',
    pathPrefix: '/billing',
    prompt: 'Need help with an invoice here?',
    chipLabel: 'Help me pay an invoice',
    reply: [
      "Here's how Billing works:",
      '1. This page lists every invoice Maitsys has sent your organization.',
      '2. Anything unpaid shows a Pay Now action — the rest is just for your records.',
      "3. Invoices are created and sent by Maitsys directly, so there's nothing to set up here.",
      '4. Contact Maitsys support if a charge looks wrong — this page only reflects what was sent, it can\'t edit an invoice.',
    ].join('\n'),
  },
  {
    key: 'smart-alerts',
    pathPrefix: '/smart-alerts',
    prompt: 'Need a hand working through your alerts?',
    chipLabel: 'Help me manage alerts',
    reply: [
      "Here's how to work through Smart Alerts:",
      '1. Use the Status and Type filters above the table to narrow things down — e.g. just Critical, or just Budget alerts.',
      "2. Each row has quick actions on the right: view details, acknowledge, or ignore (ignoring also widens that account's threshold so it doesn't fire again immediately).",
      '3. "Mark All Read" clears the unread count without acknowledging each one individually.',
      '4. Switch to Recipients to control who gets notified, and Settings to adjust detection sensitivity.',
    ].join('\n'),
  },
  {
    key: 'recommendations',
    pathPrefix: '/recommendations',
    prompt: 'Want help finding savings on this page?',
    chipLabel: 'Help me act on a recommendation',
    reply: [
      "Here's how to use Recommendations:",
      '1. Filter by provider at the top if you only want Azure, AWS, BTP or GCP recommendations.',
      "2. The KPI row splits savings into what you control (right-sizing, orphaned disks, etc.) and what Maitsys' MSP rates already save you automatically.",
      '3. Click a category card, like Reserved Instances, to see the specific line items behind that number.',
      "4. These are informational — nothing here changes your cloud spend automatically, so it's safe to explore.",
    ].join('\n'),
  },
  {
    key: 'user-management',
    pathPrefix: '/users',
    prompt: 'Need help managing your team here?',
    chipLabel: 'Help me manage users',
    reply: [
      "Here's how User Management works:",
      '1. The member table lists everyone in your org with their role and access level.',
      "2. Use Deactivate to revoke a member's access without deleting their history — Activate brings them back the same way.",
      "3. You can't deactivate your own account — that action is disabled so you're never locked out by accident.",
      "4. Only admins and owners can manage other members, per your org's permission rules.",
    ].join('\n'),
  },
  {
    key: 'subscription',
    pathPrefix: '/subscription',
    prompt: 'Questions about your plan or cloud access here?',
    chipLabel: 'Help me understand my subscription',
    reply: [
      "Here's how Subscription works:",
      '1. The top of the page shows your current plan, renewal date and enabled modules.',
      '2. If you\'re an admin, "Update Cloud Access" lets you change which providers your org connects to.',
      '3. Compare plans under Available Plans — "Choose Plan" opens a contact form, since upgrades go through Maitsys rather than self-service.',
      "4. Cloud access for non-admins is admin-managed — contact your org administrator to request a change.",
    ].join('\n'),
  },
];

export function flowGuideForPath(pathname: string): FlowGuide | undefined {
  return FLOW_GUIDES.find((guide) => pathname.startsWith(guide.pathPrefix));
}
