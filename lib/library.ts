// lib/library.ts
// ---------------------------------------------------------------------------
// The CURATED library: guides a human researched and checked against sources.
// Research date for every guide below: 2026-10-28.
//
// Four apps were chosen on purpose because each one is hard in a DIFFERENT way:
//   GitHub   -> easy: self-serve, no review. (the baseline)
//   Slack    -> hard: a manual review queue measured in weeks.
//   Google   -> hard: verification + security assessment, driven by SCOPES.
//   LinkedIn -> gated: you apply for access and may be rejected.
// ---------------------------------------------------------------------------
import type { Evidence, Guide } from "./types";

const DATE = "2026-10-28";

// tiny helpers so the data below stays readable
const official = (...sources: number[]): Evidence => ({ confidence: "official", sources });
const third = (...sources: number[]): Evidence => ({ confidence: "third-party", sources });
const unsure = (...sources: number[]): Evidence => ({ confidence: "uncertain", sources });

// ------------------------------- GITHUB ------------------------------------
const github: Guide = {
  slug: "github",
  app: "GitHub",
  website: "https://github.com",
  summary:
    "Registering a GitHub OAuth app is a self-serve form. You get a client ID and secret in minutes with no review queue, but there are two details that trip people up: only one callback URL per app, and organizations can block apps until an owner approves them.",
  difficulty: "easy",
  difficultyWhy:
    "The docs describe registration as a short form with no review step, so the only waiting is on org owners if your users belong to restricted organizations.",
  time: {
    setup: "About 10 to 20 minutes (our estimate)",
    approvalWait: "No provider review found. Organization owners may need to approve your app for their org.",
    evidence: unsure(0, 1),
  },
  approvalRequired: false,
  startHere:
    "Decide whether you need an OAuth app or a GitHub App (GitHub itself suggests considering a GitHub App), then register at Settings > Developer settings.",
  requirements: [
    {
      title: "A GitHub account that can own the app",
      detail:
        "You can register the app under your personal account or under any organization where you have administrative access.",
      evidence: official(0),
    },
    {
      title: "Four fields: name, homepage URL, callback URL (and optional description)",
      detail:
        "Application name, full homepage URL, an optional description users will see, and the Authorization callback URL. Use only information you are happy to make public.",
      evidence: official(0),
    },
    {
      title: "Exactly one callback URL per OAuth app",
      detail:
        "Unlike GitHub Apps, an OAuth app cannot have multiple callback URLs. Plan for one app per environment (local, staging, production).",
      evidence: official(0),
    },
    {
      title: "Optional: device flow",
      detail:
        "There is an 'Enable Device Flow' checkbox for apps that authorize users through the device flow (useful for CLIs and headless agents).",
      evidence: official(0),
    },
  ],
  steps: [
    {
      title: "Choose OAuth app or GitHub App",
      detail:
        "OAuth apps can only act on behalf of a user. GitHub Apps can act for a user or independently, use fine-grained permissions and short-lived tokens. If your agent needs to act on its own, read the comparison first.",
      owner: "either",
      link: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps",
    },
    {
      title: "Open Developer settings and start a new OAuth app",
      detail:
        "Profile photo > Settings > Developer settings > OAuth apps > New OAuth App. This needs a logged-in GitHub session.",
      owner: "human",
    },
    {
      title: "Fill in the form",
      detail:
        "An agent can draft the app name, homepage URL and the exact callback URL your integration expects. A person pastes them in.",
      owner: "either",
    },
    {
      title: "Register the application and store the credentials",
      detail:
        "Click Register application, then copy the client ID and generate a client secret. Put the secret in a secrets manager, never in source control.",
      owner: "human",
    },
    {
      title: "Give the credentials to your integration",
      detail:
        "Add the client ID and secret to your auth setup (for example a custom auth config in a managed-auth platform such as Composio).",
      owner: "either",
    },
    {
      title: "If your users are in restricted organizations, ask their owners to approve",
      detail:
        "Members must request approval from an organization owner before they can authorize an app against organization data. This part is always a human conversation.",
      owner: "human",
      link: "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization",
    },
  ],
  blockers: [
    {
      problem: "Users in an organization cannot authorize your app",
      why: "When OAuth app access restrictions are on, members must get an organization owner's approval before authorizing an app that touches organization resources.",
      whatToDo:
        "Give your customers a short note to send their org owner (app name, what data it needs, why). Owners approve or deny requests in organization settings.",
      evidence: official(1),
    },
    {
      problem: "You need the same app on localhost, staging and production",
      why: "An OAuth app accepts only one callback URL.",
      whatToDo:
        "Create one OAuth app per environment, or consider a GitHub App if you need several callback URLs.",
      evidence: official(0),
    },
  ],
  uncertainties: [
    "The current (cloud) version of the 'Creating an OAuth app' page could not be retrieved in this research. The steps come from GitHub Enterprise Server 3.x versions of the same page, which are GitHub's own docs but may lag the cloud UI slightly.",
    "'No provider review' is inferred: the registration steps end at 'Register application' and mention no review, but no page we read says 'no review is required' in so many words.",
    "The 'generate a client secret' step is standard practice but was not on the pages we retrieved.",
    "The 10 to 20 minute setup time is our estimate. GitHub states no duration.",
  ],
  corrections: [],
  testing: {
    attemptedSetup: false,
    notes:
      "No OAuth app was created (it needs the owner's GitHub login). The guide was checked against GitHub's published documentation only.",
  },
  sources: [
    {
      title: "Creating an OAuth app (GitHub Docs, Enterprise Server 3.8 version)",
      url: "https://docs.github.com/en/enterprise-server@3.8/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
      kind: "primary",
    },
    {
      title: "Approving OAuth apps for your organization (GitHub Docs)",
      url: "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization",
      kind: "primary",
    },
  ],
  meta: { origin: "curated", generatedAt: DATE },
};

// -------------------------------- SLACK ------------------------------------
const slack: Guide = {
  slug: "slack",
  app: "Slack",
  website: "https://slack.com",
  summary:
    "Creating the Slack app is quick, and you can distribute it to other workspaces yourself. But a Slack Marketplace listing needs 10 active installs first and then a manual review that can run past 10 weeks. Decide early which path you need.",
  difficulty: "hard",
  difficultyWhy:
    "Self-serve distribution is easy, but the Marketplace path has a hard prerequisite (10 active workspaces) and a two-stage manual review measured in weeks.",
  time: {
    setup: "Under an hour to create and distribute an unlisted app. Days to prepare Marketplace assets (landing page, privacy policy, support page, demo video).",
    approvalWait:
      "Marketplace only: preliminary review up to 10 business days, then functional review up to 10 weeks (new apps) or 6 weeks (resubmitted changes). The pages read state no review for unlisted distribution (see 'What we could not confirm').",
    evidence: official(1),
  },
  approvalRequired: true,
  startHere:
    "Decide: unlisted public distribution (fast, but some customer admins only allow Marketplace apps) or Marketplace (slow, broadly trusted). Most teams start unlisted, because the Marketplace requires 10 active installs before you can even submit.",
  requirements: [
    {
      title: "Public distribution needs a proper OAuth 2.0 flow",
      detail:
        "To install your app in other workspaces you must implement OAuth and register OAuth redirect URLs. Apps open to other workspaces have extra security requirements.",
      evidence: official(0),
    },
    {
      title: "Some workspaces only allow Marketplace-listed apps",
      detail:
        "An unlisted distributed app can be blocked by customers whose admins restrict installs to officially listed apps.",
      evidence: official(0),
    },
    {
      title: "Marketplace prerequisite: 10 or more active workspaces",
      detail:
        "The app must already be installed and tested on at least 10 active workspaces (used in the last 28 days, not sandboxes). Apps below this are blocked from submitting.",
      evidence: official(1),
    },
    {
      title: "Landing page, support page and privacy policy that are public",
      detail:
        "The landing page must be a real web page (not a PDF or repo) with a privacy link. Support must answer within 2 business days without requiring a new account. The privacy policy must cover what data is collected, use, retention, and how to request access or deletion, with an email or webform contact.",
      evidence: official(2),
    },
    {
      title: "Least-privilege scopes with a reason for each",
      detail:
        "Request the smallest set of scopes. Do not include scopes for features you have not built. Broad scopes such as admin.*, identity.*, search:read, or user-token *:history are unlikely to be approved, and some scopes trigger an enhanced review.",
      evidence: official(1, 2),
    },
    {
      title: "Test access for the reviewers",
      detail:
        "You supply test account credentials for your own service (and any third-party service the app connects to). Reviewers cannot access Slack workspaces, so you must give them a way to install the app themselves. A short demo video of install, OAuth, setup and uninstall is recommended.",
      evidence: official(1),
    },
    {
      title: "Some app types are not accepted",
      detail:
        "Not suitable: apps that only use Sign in with Slack, export or back up message data, use Slack data to train LLMs, or provide only an MCP server with no meaningful in-Slack functionality.",
      evidence: official(2),
    },
  ],
  steps: [
    {
      title: "Create the app and configure OAuth",
      detail:
        "Create a Slack app, add bot and user scopes you really need, and add every redirect URL your OAuth flow uses. An agent can draft the scope list from your API calls.",
      owner: "either",
      link: "https://api.slack.com/apps",
    },
    {
      title: "Use the state parameter and verify request signatures",
      detail:
        "Marketplace security requirements include the OAuth state parameter and verifying requests with signing secrets or mutual TLS.",
      owner: "agent",
      link: "https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements#security",
    },
    {
      title: "Activate public distribution",
      detail: "Under Manage Distribution, complete the checklist and click Activate Public Distribution.",
      owner: "human",
      link: "https://docs.slack.dev/distribution",
    },
    {
      title: "Get to 10 active workspaces",
      detail:
        "Install and test on real workspaces, including onboarding as a brand-new customer would and uninstalling. This is the longest self-controlled step.",
      owner: "human",
    },
    {
      title: "Prepare the listing assets and pages",
      detail:
        "Landing page, support page, privacy policy, icon, 1600x1000 screenshots, descriptions, and a demo video. An agent can draft copy and the privacy policy outline. A person approves the legal text.",
      owner: "either",
    },
    {
      title: "Submit for Marketplace review and answer feedback",
      detail:
        "Automated checks run first, then manual preliminary review (up to 10 business days), then functional review (up to 10 weeks). Your place in the queue resets on resubmission during the preliminary stage but not once a reviewer is assigned.",
      owner: "human",
      link: "https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide",
    },
  ],
  blockers: [
    {
      problem: "You cannot submit: 'fewer than 10 active workspaces'",
      why: "The Marketplace blocks submissions from apps without 10 installs used within the last 28 days.",
      whatToDo:
        "Distribute the app unlisted, recruit design partners or customers, and track 28-day activity before submitting.",
      evidence: official(1),
    },
    {
      problem: "Review feedback restarts the clock",
      why: "During the preliminary stage your queue place resets on each resubmission.",
      whatToDo:
        "Check every guideline before submitting. Fix the whole list at once instead of resubmitting piecemeal.",
      evidence: official(1),
    },
    {
      problem: "You need a new scope after launch",
      why: "Once published, the live app is locked. Changes to configuration, features or scopes require resubmission, and new scopes need a video demo or staging app.",
      whatToDo:
        "Keep a staging copy of the app (create it from your manifest) and plan scope changes weeks ahead. Do not ship install links with unreviewed scopes: they show customers an error.",
      evidence: official(1),
    },
    {
      problem: "A customer's admin blocks installation",
      why: "Other workspaces may allow only officially listed Marketplace apps.",
      whatToDo: "Point that customer to your Marketplace listing, or start the Marketplace process earlier.",
      evidence: official(0),
    },
  ],
  uncertainties: [
    "Review durations are stated as maximums ('up to'), and Slack says turnaround varies with volume. The submission page in your own app settings shows the current estimate.",
    "Whether unlisted public distribution requires any review: Slack's docs draw the listed/unlisted distinction, and a third-party guide says it needs no review, but we did not find a primary statement in these pages.",
    "A Slack security review can also happen at any point after submission, with no stated duration.",
    "The setup-time figures (under an hour, days for assets) are our estimates. Slack states no hands-on duration.",
  ],
  corrections: [
    "A third-party guide's snippet suggested a lower install threshold for Marketplace eligibility (it was cut off at '5 or'). Slack's own review guide says 10 or more active workspaces, so this guide uses 10.",
    "A 2026 blog describes a roughly 12-week review clock. Slack's own docs state up to 10 weeks for the functional review plus up to 10 business days preliminary, so those are the figures used here.",
  ],
  testing: {
    attemptedSetup: false,
    notes:
      "No Slack app was submitted (that would need a real product, a live workspace set and a business listing). All claims come from Slack's current developer docs, read on 2026-10-28.",
  },
  sources: [
    { title: "App distribution (Slack Developer Docs)", url: "https://docs.slack.dev/distribution", kind: "primary" },
    {
      title: "Slack Marketplace review process (Slack Developer Docs)",
      url: "https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide",
      kind: "primary",
    },
    {
      title: "Submission guidelines and requirements (Slack Developer Docs)",
      url: "https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements",
      kind: "primary",
    },
    {
      title: "What shipping an OAuth app on Slack, Microsoft, and Atlassian actually takes (WorkOS)",
      url: "https://workos.com/blog/oauth-app-approval-slack-microsoft-atlassian",
      kind: "secondary",
    },
  ],
  meta: { origin: "curated", generatedAt: DATE },
};

// -------------------------------- GOOGLE -----------------------------------
const google: Guide = {
  slug: "google-gmail",
  app: "Google (Gmail API)",
  website: "https://developers.google.com/gmail/api",
  summary:
    "Creating a Google OAuth client takes minutes, but going live for the public depends on which scopes you ask for. Non-sensitive scopes need little. Sensitive scopes need Google verification. Restricted scopes (most of Gmail) add a third-party security assessment that repeats every year.",
  difficulty: "hard",
  difficultyWhy:
    "Reading mail uses restricted scopes, which need verification plus an annual security assessment. Sending-only or calendar-only apps are lighter.",
  time: {
    setup: "About 30 to 60 minutes to create the project and OAuth client. Days to prepare verification materials.",
    approvalWait:
      "Google publishes no fixed duration in the pages we read. Third-party estimates: sensitive-only verification often under a week; restricted scopes with the security assessment typically weeks.",
    evidence: unsure(0, 4, 5),
  },
  approvalRequired: true,
  startHere:
    "Before creating anything, list exactly which Gmail methods you call and pick the narrowest scopes. The scope you choose decides whether you face a quick verification or a yearly security assessment.",
  requirements: [
    {
      title: "Verification is required for public apps using sensitive or restricted scopes",
      detail:
        "Apps requesting sensitive or restricted scopes must complete Google's OAuth app verification before being granted access. Apps using only non-sensitive scopes do not have to verify, though brand verification is needed to show your app name and logo.",
      evidence: official(0, 1),
    },
    {
      title: "Restricted scopes need annual re-verification",
      detail:
        "Apps that access restricted scope data must re-verify every year. The security assessment is performed by an approved third-party assessor and also repeats every 12 months.",
      evidence: official(0),
    },
    {
      title: "Verification materials",
      detail:
        "A privacy policy URL on the consent screen (plus homepage and terms URLs if you have them), proof of website ownership in Search Console from a Project Owner or Editor account, and a verification request submitted from the consent screen.",
      evidence: official(2),
    },
    {
      title: "Which Gmail scopes are 'restricted'",
      detail:
        "Several third-party sources agree that gmail.readonly, gmail.modify, gmail.compose, gmail.insert and gmail.metadata are restricted, while gmail.send is sensitive. Mixing them puts the whole app in the restricted tier.",
      evidence: third(5, 6, 4),
    },
  ],
  steps: [
    {
      title: "Choose the minimum scopes",
      detail:
        "An agent can scan your code or planned API calls and propose the narrowest scope set. A person approves the trade-off, because it changes the review path.",
      owner: "either",
    },
    {
      title: "Create a Google Cloud project and enable the Gmail API",
      detail: "Requires a Google account with access to Cloud Console.",
      owner: "human",
      link: "https://console.cloud.google.com/",
    },
    {
      title: "Configure the OAuth consent screen and add scopes",
      detail:
        "Add the scopes you chose. Cloud Console labels each scope non-sensitive, sensitive or restricted, so check the labels match the plan.",
      owner: "human",
    },
    {
      title: "Create the OAuth client and register redirect URIs",
      detail:
        "An agent drafts the exact redirect URIs for each environment. A person creates the client and stores the secret safely.",
      owner: "either",
    },
    {
      title: "Develop in Testing mode",
      detail:
        "Testing apps are limited to 100 test users and refresh tokens expire after 7 days. Do not mistake this for a production bug.",
      owner: "human",
    },
    {
      title: "Prepare verification materials",
      detail:
        "Privacy policy page, homepage, Search Console domain ownership. An agent can draft the policy text. A person must review the legal wording and own the domain.",
      owner: "either",
      link: "https://support.google.com/cloud/answer/7454865",
    },
    {
      title: "Submit for verification",
      detail: "Submit from the consent screen and answer Google's follow-up questions by email.",
      owner: "human",
    },
    {
      title: "If you use restricted scopes: complete the security assessment",
      detail:
        "Pick an approved assessor, fix findings from a first scan, complete the assessment and obtain the validation letter. Assessors list different start-time options, so confirm cost and duration with the assessor you choose.",
      owner: "human",
    },
  ],
  blockers: [
    {
      problem: "Refresh tokens stop working after about a week",
      why: "Apps in Testing status have a 7-day refresh token limit.",
      whatToDo:
        "Move to production (and verify if needed). A Workspace admin can mark an app as Trusted to lift the limit for their own organization.",
      evidence: official(1),
    },
    {
      problem: "Users see the 'unverified app' warning and you hit a 100-user ceiling",
      why: "Unverified apps requesting sensitive or restricted scopes are limited to 100 total users and show a warning screen.",
      whatToDo: "Submit verification early. The cap lifts when verification succeeds.",
      evidence: official(1, 2),
    },
    {
      problem: "Adding a scope later sends you back through review",
      why: "Changing the client or adding new scopes after verification may require verifying again, and adding a restricted scope can mean another assessment.",
      whatToDo: "Decide the full scope set up front. Drop scopes you do not call.",
      evidence: official(2),
    },
    {
      problem: "The assessment is a surprise cost and delay",
      why: "Each restricted scope puts the app in the restricted tier, which requires the annual third-party assessment.",
      whatToDo:
        "Check whether a lighter scope (for example send-only) can meet the need, or whether a partner with an already-certified app suits you better for early launch.",
      evidence: third(4, 5),
    },
  ],
  uncertainties: [
    "Google's own list of restricted Gmail scopes was not retrieved. The classification comes from several consistent third-party sources. Confirm it in the scope table in Cloud Console before you plan.",
    "Review duration is not stated by Google in the pages read. The ranges here are third-party anecdotes.",
    "The cost of the security assessment varies by assessor and is not quoted here.",
    "Google limits restricted Gmail scopes to certain application types according to one third-party guide. We could not confirm this on a Google page.",
  ],
  corrections: [
    "One third-party guide (Unipile) lists gmail.readonly as only 'sensitive'. Three other sources (Nylas, EmailEngine, Nango) classify gmail.readonly as restricted, so this guide treats it as restricted. Verify in the scope table in Cloud Console.",
    "One third-party guide says the Gmail API 'always' triggers Google verification. Google's own help page says apps using only non-sensitive scopes are not required to complete verification, so the real question is which scopes you request.",
  ],
  testing: {
    attemptedSetup: false,
    notes:
      "No Cloud project was created and no verification was submitted. Official claims were read from Google's help and developer pages on 2026-10-28. Scope classification and timelines rely on third-party sources.",
  },
  sources: [
    { title: "OAuth App Verification Help Center (Google)", url: "https://support.google.com/cloud/answer/13463073", kind: "primary" },
    {
      title: "OAuth app state overview (Google for Developers)",
      url: "https://developers.google.com/identity/protocols/oauth2/production-readiness/overview",
      kind: "primary",
    },
    { title: "Unverified apps (Google Cloud Console Help)", url: "https://support.google.com/cloud/answer/7454865", kind: "primary" },
    {
      title: "Cloud Application Security Assessment (Leviathan Security, approved assessor)",
      url: "https://www.leviathansecurity.com/programs/google-casa-cloud-application-security-assessment",
      kind: "secondary",
    },
    {
      title: "Google security review (Nango docs)",
      url: "https://nango.dev/docs/api-integrations/google-shared/google-security-review",
      kind: "secondary",
    },
    {
      title: "Gmail API OAuth scopes reference (Nylas)",
      url: "https://developer.nylas.com/docs/cookbook/use-cases/build/google-oauth-scopes/",
      kind: "secondary",
    },
    {
      title: "Gmail API scopes reference (EmailEngine)",
      url: "https://learn.emailengine.app/docs/accounts/gmail/gmail-api-scopes",
      kind: "secondary",
    },
  ],
  meta: { origin: "curated", generatedAt: DATE },
};

// ------------------------------- LINKEDIN ----------------------------------
const linkedin: Guide = {
  slug: "linkedin",
  app: "LinkedIn",
  website: "https://developer.linkedin.com",
  summary:
    "Basic Sign In with LinkedIn is self-serve. Anything more (company pages, posting for organizations, ads) is application-only: you apply, LinkedIn reviews, and a rejection means starting over with a new app.",
  difficulty: "gated",
  difficultyWhy:
    "The useful APIs are partner-gated, approval is manual, and LinkedIn does not publish a timeline or guarantee approval.",
  time: {
    setup: "About 30 minutes for the app and the application form. Days to prepare a use-case description and a screen recording.",
    approvalWait:
      "No official duration. One third-party source reports about 4 weeks at best and around 4 months on average for the marketing tier.",
    evidence: unsure(4),
  },
  approvalRequired: true,
  startHere:
    "Write down exactly what your users need to do on LinkedIn. If it is only sign-in, you are done quickly. If it involves company pages or ads, start the access application first, because everything else waits on it.",
  requirements: [
    {
      title: "Two tiers: Development first, then Standard",
      detail:
        "For the Community Management and Advertising APIs, every application starts in the Development tier and applies separately to upgrade to Standard. Development is for building and testing with limits (Community Management is expected to finish testing within 12 months). Standard is for live production.",
      evidence: official(0, 1),
    },
    {
      title: "A fresh developer app for the Development tier request",
      detail:
        "You can request Community Management Development tier access only with a new developer application that has no other API product.",
      evidence: official(0),
    },
    {
      title: "A screen recording for the Standard tier",
      detail:
        "You must submit a screen recording demonstrating each use case you listed in the access request form.",
      evidence: official(0, 2),
    },
    {
      title: "No LinkedIn or Microsoft names or logos in your app",
      detail: "The review checks that your application does not include these marks.",
      evidence: official(2),
    },
    {
      title: "Sign-in and basic sharing are open",
      detail:
        "Sign In with LinkedIn (OpenID Connect) and Share on LinkedIn are described by third parties as available without approval. Marketing, sales, talent and learning APIs need partner approval.",
      evidence: third(5),
    },
  ],
  steps: [
    {
      title: "Decide which LinkedIn product you need",
      detail:
        "An agent can map your feature list to LinkedIn's products (Sign In, Share, Community Management, Advertising). A person confirms the business case.",
      owner: "either",
    },
    {
      title: "Create a developer app dedicated to the request",
      detail: "Sign in to the LinkedIn developer portal and create a new app. Keep it free of other API products if you are requesting Community Management Development tier.",
      owner: "human",
      link: "https://developer.linkedin.com",
    },
    {
      title: "Submit the access request form",
      detail:
        "Describe the use case precisely. An agent can draft the answers from your product plan. A person submits under the company's identity.",
      owner: "either",
    },
    {
      title: "Build and test in the Development tier",
      detail: "Integrate with the API limits in mind and record the flows you will need to demonstrate.",
      owner: "either",
    },
    {
      title: "Apply for the Standard tier with a screen recording",
      detail: "The form appears in the developer portal under My Apps > Products after Development tier approval.",
      owner: "human",
    },
  ],
  blockers: [
    {
      problem: "Your request is rejected",
      why: "A rejected app cannot re-apply for the same tier.",
      whatToDo:
        "Read the qualification criteria, create a new developer app, and submit a new Development tier request with a clearer use case.",
      evidence: official(2),
    },
    {
      problem: "You cannot predict your launch date",
      why: "LinkedIn does not publish review timelines, and approval is not guaranteed even if requirements are met.",
      whatToDo:
        "Plan a launch that works without the gated API first (sign-in only), and treat the gated features as a later release.",
      evidence: unsure(4),
    },
    {
      problem: "Standard tier needs a working integration you cannot build yet",
      why: "Standard tier is requested after Development tier, and the demonstration must show each declared use case.",
      whatToDo: "Script the demo recording during development so it is ready the day you qualify.",
      evidence: official(0, 2),
    },
  ],
  uncertainties: [
    "LinkedIn states no review duration on the pages we read. The 4 weeks to 4 months range is a single third-party report.",
    "Pricing: one third-party article estimates paid access at roughly 'from $699 a month' for the marketing tier, labeled an estimate. LinkedIn's own pages we read quote no price, so this guide does not rely on a figure.",
    "The Community Management app review page we retrieved is a versioned copy (2023-11). Requirements may have changed.",
    "Which tier or product is right for a given use case depends on details we did not test.",
  ],
  corrections: [
    "Many blogs call the gated tier the 'Marketing Developer Platform'. Microsoft's current pages organize access as the Advertising API and Community Management API, each with a Development and a Standard tier, so this guide uses those names.",
    "Some older guides still list the r_liteprofile scope. A newer third-party article lists the OpenID Connect scopes (openid, profile, email) for sign-in, so we did not repeat the older name. We did not confirm the current scope list on a LinkedIn page.",
  ],
  testing: {
    attemptedSetup: false,
    notes:
      "No LinkedIn app or access request was created. Tier rules were read from Microsoft Learn's LinkedIn documentation on 2026-10-28. Timelines and the open-tier claim come from third parties.",
  },
  sources: [
    {
      title: "Community Management API overview (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview",
      kind: "primary",
    },
    {
      title: "Increasing access (Microsoft Learn)",
      url: "https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access",
      kind: "primary",
    },
    {
      title: "Community Management app review (Microsoft Learn, 2023-11 version)",
      url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2023-11",
      kind: "primary",
    },
    {
      title: "Getting access to the Conversions API (Microsoft Learn, 2023-09 version)",
      url: "https://learn.microsoft.com/en-us/linkedin/marketing/conversions/getting-access-conversions?view=li-lms-2023-09",
      kind: "primary",
    },
    {
      title: "LinkedIn API access in 2026: partner program, approval timeline (Phyllo)",
      url: "https://www.getphyllo.com/post/linkedin-api-access-in-2026-partner-program-approval-timeline-alternatives",
      kind: "secondary",
    },
    {
      title: "LinkedIn API: the real map of access, pricing, and limits (Elfsight)",
      url: "https://elfsight.com/blog/linkedin-api-access-and-pricing/",
      kind: "secondary",
    },
  ],
  meta: { origin: "curated", generatedAt: DATE },
};

export const LIBRARY: Guide[] = [github, slack, google, linkedin];

export function getLibraryGuide(slug: string): Guide | undefined {
  return LIBRARY.find((g) => g.slug === slug);
}
