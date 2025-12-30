/**
 * Issue Triage Logic
 * Extracted from issue-triage.yml for maintainability
 */

export async function triageIssue(github, context, manifest) {
  const issue = context.payload.issue;
  const title = issue.title || '';
  const body = issue.body || '';
  const author = issue.user.login;
  const labels = issue.labels?.map(l => l.name) || [];
  
  const fullText = `${title}\n\n${body}`;
  const fullTextLower = fullText.toLowerCase();
  const titleLower = title.toLowerCase();

  // Extract manifest data
  const existingTools = manifest.tools ? Object.values(manifest.tools) : [];
  const existingCapabilities = existingTools.flatMap(t => 
    (t.capabilities || []).map(c => ({ tool: t.name, capability: c }))
  );

  // ============================================
  // STEP 1.5: COMMUNITY vs CORE TEAM CHECK
  // ============================================
  const CORE_TEAM = ['dmgrok', 'a447ah'];
  const isFromCoreTeam = CORE_TEAM.includes(author);

  // AI-Powered Technology vs Functionality Detection
  let isTechnologyFocused = false;
  let isFunctionalityFocused = false;
  let techAnalysis = null;

  if (!isFromCoreTeam) {
    try {
      const analysisPrompt = `Analyze this GitHub issue to determine if it's TECHNOLOGY-FOCUSED or FUNCTIONALITY-FOCUSED.

ISSUE:
Title: ${title}
Body: ${body}

DEFINITIONS:
- **TECHNOLOGY-FOCUSED**: Specifies HOW to implement (mentions specific frameworks, libraries, databases, languages, tools)
  Examples: "use React", "implement with PostgreSQL", "add GraphQL API", "switch to TypeScript"

- **FUNCTIONALITY-FOCUSED**: Describes WHAT problem to solve and WHY (user needs, pain points, use cases)
  Examples: "help organizers shuffle teams faster", "participants need to vote on topics", "make check-in easier"

PROJECT CONTEXT:
This is an event tools platform. Good requests describe:
- Problems event organizers or participants face
- What they're trying to accomplish
- Specific event scenarios or use cases
Bad requests from community members prescribe technical solutions.

Respond in EXACT JSON format:
{
  "isTechnologyFocused": true/false,
  "isFunctionalityFocused": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "detectedTechTerms": ["list", "of", "technology", "terms"],
  "detectedNeeds": ["list", "of", "user", "needs"]
}

Be strict: If it mentions ANY specific technology as a requirement (not just an example), mark as technology-focused.`;

      const response = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a GitHub issue triage assistant. Respond ONLY with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          techAnalysis = JSON.parse(jsonMatch[0]);
          isTechnologyFocused = techAnalysis.isTechnologyFocused;
          isFunctionalityFocused = techAnalysis.isFunctionalityFocused;
          console.log('Technology Analysis:', JSON.stringify(techAnalysis));
        }
      }
    } catch (e) {
      console.log('AI technology analysis failed, defaulting to accepting issue:', e.message);
      isFunctionalityFocused = true; // Default to accepting if AI fails
    }
  }

  if (!isFromCoreTeam && isTechnologyFocused && !isFunctionalityFocused) {
    const techTerms = techAnalysis?.detectedTechTerms?.slice(0, 5).join(', ') || 'technology terms';
    const reasoning = techAnalysis?.reasoning || 'This request focuses on implementation details rather than user problems';
  if (!isFromCoreTeam && isTechnologyFocused && !isFunctionalityFocused) {
    const techTerms = techAnalysis?.detectedTechTerms?.slice(0, 5).join(', ') || 'technology terms';
    const reasoning = techAnalysis?.reasoning || 'This request focuses on implementation details rather than user problems';

    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['technology-focused', 'needs-resubmit', 'auto-triaged']
    });

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: `🤖 **Please Resubmit: Focus on the Problem, Not the Tech**

Hey @${author}! Thanks for your interest in improving Event Tools Lab! 

We noticed your request focuses on **implementation details** rather than **user problems**. As a community-driven project, we prioritize requests that describe:

**What we need from you:**
- 🎯 **The problem** - What's frustrating or missing for event organizers/participants?
- 👤 **Your role** - Are you an organizer? Participant? What type of events?
- 📖 **A scenario** - "When I'm running a workshop, I need to..."
- ✨ **The value** - How would this make events better?

**AI Analysis:**
${reasoning}

${techTerms !== 'technology terms' ? `**Detected technology terms:** ${techTerms}` : ''}

**Why this matters:**
We make implementation decisions based on user needs, not technology preferences. The same user problem might be solved many different ways - we want to pick the best one!

**Example of a great request:**
> "As an event organizer, I need to quickly shuffle 50+ participants into random teams. Currently I use a spreadsheet which takes 10 minutes. I'd love a tool that does this in one click."

**Please resubmit** with a focus on:
1. The problem you're trying to solve
2. Who benefits (organizers, participants, or both)
3. A specific use case or scenario

Use our [Tool Request](../../issues/new?template=tool-request.yml) or [Improvement](../../issues/new?template=improvement.yml) templates for guidance!

---
*🤖 Automated triage - we want to understand your needs, not just the tech!*`
    });

    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned'
    });

    console.log(`Issue #${issue.number} closed - technology-focused (non-core team)`);
    return { closed: true, reason: 'technology-focused' };
  }

  if (isFunctionalityFocused) {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['functionality-based']
    });
  }

  // ============================================
  // STEP 2: OUT OF SCOPE DETECTION (AI-Powered)
  // ============================================
  let scopeAnalysis = null;
  
  try {
    const scopePrompt = `Analyze this GitHub issue to determine if it's a COMMODITY TOOL or OUT OF SCOPE for an event tools platform.

ISSUE:
Title: ${title}
Body: ${body}

PROJECT CONTEXT:
This is a small event tools platform focused on simple, event-specific micro-tools.

DEFINITIONS:

**COMMODITY TOOLS** - Things with excellent existing solutions (we'd be reinventing the wheel):
- General productivity: calculators, notepads, text editors, spreadsheets
- Communication: email clients, chat apps, video calls (unless event-specific twist)
- Common utilities: calendars, task managers, password managers, file sharing
- Presentation tools: slide makers, whiteboards, mind maps (unless event-specific)

**OUT OF SCOPE** - Enterprise/complex infrastructure beyond our capacity:
- Database systems, enterprise SSO/auth
- Payment processing, billing systems
- Analytics dashboards, BI tools
- Native mobile/desktop apps
- Video conferencing platforms
- CRM, ERP systems
- Blockchain, ML models, advanced AI

**IN SCOPE** - Event-specific tools we DO build:
- Team shuffling, random group assignment
- Session timers, countdown displays
- Live polls, voting for sessions
- Event check-in, QR codes
- Simple participant management

Respond in EXACT JSON format:
{
  "isCommodityTool": true/false,
  "isOutOfScope": true/false,
  "isEventSpecific": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "category": "commodity|out-of-scope|in-scope",
  "detectedConcepts": ["list", "of", "main", "concepts"]
}

Be generous: If there's ANY event-specific angle, mark as in-scope.`;

    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a GitHub issue triage assistant. Respond ONLY with valid JSON.' },
          { role: 'user', content: scopePrompt }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scopeAnalysis = JSON.parse(jsonMatch[0]);
        console.log('Scope Analysis:', JSON.stringify(scopeAnalysis));
      }
    }
  } catch (e) {
    console.log('AI scope analysis failed, continuing to next step:', e.message);
  }

  // Handle commodity tool requests
  if (scopeAnalysis?.isCommodityTool && !scopeAnalysis?.isEventSpecific) {
    const concepts = scopeAnalysis.detectedConcepts?.slice(0, 3).join(', ') || 'general productivity tools';
    
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['not-differentiator', 'auto-triaged']
    });

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: `🎸 **Closed: Already Solved Elsewhere** (We'd Be Reinventing the Wheel!)

**AI Analysis:** ${scopeAnalysis.reasoning}

**Detected concepts:** ${concepts}

There are already fantastic tools for this! We'd rather focus on *weird and wonderful* event-specific stuff. 🛞

What we build instead:
- 🎲 **Team Shuffler** - random groups = magic
- ⏱️ **Session Timer** - keeping speakers honest since 2024
- 🗳️ **Quick Poll** - democracy at the speed of WiFi
- 📱 **QR Check-In** - no clipboard, no cry

If there's an event-specific twist we're missing, we're all ears! Resubmit with your unique angle.

---
*🤖 Automated triage - standing on the shoulders of existing giants*`
    });

    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned'
    });

    console.log(`Issue #${issue.number} closed - commodity tool request`);
    return { closed: true, reason: 'commodity-tool' };
  }

  // Handle out-of-scope requests
  if (scopeAnalysis?.isOutOfScope && !scopeAnalysis?.isEventSpecific) {
    const concepts = scopeAnalysis.detectedConcepts?.slice(0, 3).join(', ') || 'enterprise features';
    
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['out-of-scope', 'auto-triaged']
    });

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: `🚀 **Closed: Out of Scope** (Too Big For Our Little Spaceship!)

**AI Analysis:** ${scopeAnalysis.reasoning}

**Detected concepts:** ${concepts}

That's beyond our humble event tools orbit! We're more "cozy workshop helper" than "enterprise space station." 🛸

**Our philosophy:**
- ✅ Simple, single-purpose event tools
- ✅ Works without complex setup
- ✅ Small team, realistic scope
- ❌ No enterprise features until proven necessary
- ❌ No complex infrastructure (we like sleep)

We appreciate you thinking big though! Maybe that's a great startup idea? 💡

---
*🤖 Automated triage - keeping our feet on the ground*`
    });

    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned'
    });

    console.log(`Issue #${issue.number} closed - out of scope`);
    return { closed: true, reason: 'out-of-scope' };
  }

  // ============================================
  // STEP 2.5: AI-POWERED DUPLICATE CHECK
  // ============================================
  let aiAnalysis = await checkDuplicateWithAI(github, context, manifest, {
    title, body, labels, titleLower, fullTextLower, existingTools, existingCapabilities
  });

  if (aiAnalysis?.duplicatesExisting && aiAnalysis?.matchedTool) {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['duplicate-functionality', 'auto-triaged']
    });

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: `🎉 **Closed: Already Exists!** (Great Minds Think Alike)

Plot twist: we already built this! Check out our **${aiAnalysis.matchedTool}** tool. 🛠️

${aiAnalysis.matchedCapability ? `**What it does:** ${aiAnalysis.matchedCapability}` : ''}

${aiAnalysis.reasoning || ''}

**Next steps:**
- 👀 Give the existing tool a spin - it might be exactly what you need!
- 🔧 If it's *close but not quite*, tell us how to make it better
- 📝 Use our [improvement template](../../issues/new?template=improvement.yml) to suggest tweaks

We love that you're thinking along the same lines!

---
*🤖 Automated triage - same wavelength!*`
    });

    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned'
    });

    console.log(`Issue #${issue.number} closed - duplicates ${aiAnalysis.matchedTool}`);
    return { closed: true, reason: 'duplicate' };
  }

  if (aiAnalysis?.isEnhancement && aiAnalysis?.enhancementOf) {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['enhancement', `tool:${aiAnalysis.enhancementOf.toLowerCase().replace(/\s+/g, '-')}`, 'auto-triaged']
    });

    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: `💡 **Enhancement Request Identified**

This looks like an enhancement to our existing **${aiAnalysis.enhancementOf}** tool.

${aiAnalysis.reasoning || ''}

**Interest Score:** ${'⭐'.repeat(Math.min(aiAnalysis.interestScore || 5, 10))}

A maintainer will evaluate this enhancement request.

---
*Automated triage*`
    });

    console.log(`Issue #${issue.number} identified as enhancement to ${aiAnalysis.enhancementOf}`);
  }

  // ============================================
  // STEP 3: VALUE ASSESSMENT
  // ============================================
  const valueResult = assessValue(fullTextLower);
  
  // ============================================
  // STEP 4: BREAKING CHANGE DETECTION
  // ============================================
  const isPotentiallyBreaking = detectBreakingChanges(fullText);

  // ============================================
  // STEP 5: FINAL DECISION
  // ============================================
  let issueType = 'unknown';
  if (labels.includes('tool-request') || titleLower.includes('[tool]')) {
    issueType = 'tool-request';
  } else if (labels.includes('bug') || titleLower.includes('[bug]')) {
    issueType = 'bug';
  } else if (labels.includes('enhancement') || titleLower.includes('[improvement]')) {
    issueType = 'improvement';
  }

  let decision = 'review';
  let labelsToAdd = ['auto-triaged'];
  let comment = '';

  const MINIMUM_VALUE_SCORE = 5;

  if (isPotentiallyBreaking) {
    decision = 'human-review';
    labelsToAdd.push('breaking-change', 'needs-human-review');
    comment = `⚠️ **Requires Human Review - Potential Breaking Change**

This issue may involve breaking changes that need careful evaluation.

A maintainer will review this manually to assess impact.

---
*Automated triage - flagged for human review*`;
  } else if (!valueResult.hasOrganizerValue || !valueResult.hasParticipantValue) {
    decision = 'reject';
    labelsToAdd.push('needs-value-prop');

    const missing = [];
    if (!valueResult.hasOrganizerValue) missing.push('value for event organizers');
    if (!valueResult.hasParticipantValue) missing.push('value for participants');

    comment = `🤷 **Closed: Missing Value Proposition** (Convince Us!)

We build tools for the whole event crew - organizers AND participants need to benefit!

**Currently missing:** ${missing.join(' and ')}

Help us see the magic! Resubmit explaining:
1. 📋 How does this help **event organizers** run smoother events?
2. 🎭 How does this improve the **participant experience**?
3. ✨ What makes this special vs. existing solutions?

We're not saying no forever - just "tell us more!" The best tools come from compelling stories.

---
*🤖 Automated triage - we dare you to convince us!*`;

    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned'
    });
  } else if (valueResult.valueScore >= MINIMUM_VALUE_SCORE) {
    decision = 'accept';
    labelsToAdd.push('needs-review', issueType !== 'unknown' ? issueType : 'triage');

    if (valueResult.valueScore >= 10) {
      labelsToAdd.push('high-value');
    }

    comment = `✅ **Issue Accepted for Review**

This looks like a valuable addition to Event Tools Lab!

**Value assessment:**
${valueResult.valueDetails.map(d => `- ${d}`).join('\n')}

A maintainer will review this and determine next steps.

---
*Automated triage*`;
  } else {
    decision = 'review';
    labelsToAdd.push('needs-review');
    comment = `👀 **Issue Under Review**

Thanks for your submission. A maintainer will evaluate this request.

**Initial assessment:**
${valueResult.valueDetails.length > 0 ? valueResult.valueDetails.map(d => `- ${d}`).join('\n') : '- Needs further evaluation'}

---
*Automated triage*`;
  }

  try {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: labelsToAdd
    });
  } catch (e) {
    console.log('Label error:', e.message);
  }

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issue.number,
    body: comment
  });

  console.log(`Issue #${issue.number} triaged: ${decision} (value: ${valueResult.valueScore}, breaking: ${isPotentiallyBreaking})`);
  
  return { closed: false, decision, valueScore: valueResult.valueScore };
}

async function checkDuplicateWithAI(github, context, manifest, data) {
  const { title, body, labels, titleLower, fullTextLower, existingTools, existingCapabilities } = data;
  
  let existingFunctionalityMatch = null;
  let aiAnalysis = null;

  const toolsSummary = existingTools.map(t => 
    `- ${t.name} (${t.status}): ${t.description}. Capabilities: ${(t.capabilities || []).join(', ')}`
  ).join('\n');

  for (const cap of existingCapabilities) {
    const capWords = cap.capability.split(/\s+/);
    const matchCount = capWords.filter(w => fullTextLower.includes(w.toLowerCase())).length;
    if (matchCount >= Math.min(3, capWords.length * 0.6)) {
      existingFunctionalityMatch = cap;
      break;
    }
  }

  if (existingFunctionalityMatch || labels.includes('tool-request') || titleLower.includes('[tool]')) {
    try {
      const outOfScopeSummary = manifest.outOfScope?.categories?.map(c => 
        `- ${c.name}: ${(c.examples || []).slice(0, 5).join(', ')}`
      ).join('\n') || 'Not specified';

      const evalCriteria = manifest.evaluationCriteria?.mustHave?.map(c => `- ${c}`).join('\n') 
        || 'Value for both organizers AND participants';

      const analysisPrompt = `You are evaluating a GitHub issue for an event tools platform.

EXISTING TOOLS AND CAPABILITIES:
${toolsSummary}

OUT OF SCOPE (from manifest):
${outOfScopeSummary}

EVALUATION CRITERIA:
${evalCriteria}

NEW ISSUE TO EVALUATE:
Title: ${title}
Body: ${body}

ANALYZE and respond in this EXACT JSON format:
{
  "duplicatesExisting": true/false,
  "matchedTool": "tool name or null",
  "matchedCapability": "capability description or null",
  "isEnhancement": true/false,
  "enhancementOf": "tool name or null",
  "reasoning": "brief explanation",
  "recommendation": "accept|enhance|duplicate|reject",
  "interestScore": 1-10
}

Rules:
- duplicatesExisting=true if this ALREADY exists in our tools
- isEnhancement=true if this IMPROVES an existing tool (not duplicates)
- interestScore: 10=highly valuable unique feature, 1=spam/irrelevant
- Be strict about duplicates but generous about enhancements`;

      const response = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an issue triage assistant. Respond ONLY with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
          console.log('AI Analysis:', JSON.stringify(aiAnalysis));
        }
      }
    } catch (e) {
      console.log('AI analysis failed, continuing with heuristics:', e.message);
    }
  }

  return aiAnalysis;
}

function assessValue(fullTextLower) {
  const VALUE_INDICATORS = {
    organizerValue: [
      'save time', 'easier', 'automate', 'simplify', 'manage',
      'organize', 'coordinate', 'track', 'monitor', 'control'
    ],
    participantValue: [
      'engage', 'interact', 'participate', 'collaborate', 'connect',
      'share', 'vote', 'feedback', 'join', 'experience'
    ],
    differentiators: [
      'real-time', 'live', 'instant', 'sync', 'together',
      'shuffle', 'random', 'team', 'group', 'breakout',
      'timer', 'countdown', 'session', 'poll', 'vote',
      'check-in', 'qr', 'attendance', 'roster'
    ],
    eventContext: [
      'workshop', 'conference', 'meetup', 'hackathon', 'training',
      'seminar', 'presentation', 'talk', 'session', 'unconference',
      'facilitator', 'speaker', 'attendee', 'participant'
    ]
  };

  let valueScore = 0;
  let valueDetails = [];

  const organizerMatches = VALUE_INDICATORS.organizerValue.filter(v => fullTextLower.includes(v));
  if (organizerMatches.length > 0) {
    valueScore += Math.min(organizerMatches.length, 3);
    valueDetails.push(`Organizer value: ${organizerMatches.join(', ')}`);
  }

  const participantMatches = VALUE_INDICATORS.participantValue.filter(v => fullTextLower.includes(v));
  if (participantMatches.length > 0) {
    valueScore += Math.min(participantMatches.length, 3);
    valueDetails.push(`Participant value: ${participantMatches.join(', ')}`);
  }

  const diffMatches = VALUE_INDICATORS.differentiators.filter(v => fullTextLower.includes(v));
  if (diffMatches.length > 0) {
    valueScore += Math.min(diffMatches.length * 2, 6);
    valueDetails.push(`Differentiators: ${diffMatches.join(', ')}`);
  }

  const contextMatches = VALUE_INDICATORS.eventContext.filter(v => fullTextLower.includes(v));
  if (contextMatches.length > 0) {
    valueScore += Math.min(contextMatches.length, 3);
    valueDetails.push(`Event context: ${contextMatches.join(', ')}`);
  }

  const hasOrganizerValue = organizerMatches.length > 0 || diffMatches.length > 0;
  const hasParticipantValue = participantMatches.length > 0 || diffMatches.length > 0;

  return { valueScore, valueDetails, hasOrganizerValue, hasParticipantValue };
}

function detectBreakingChanges(fullText) {
  const BREAKING_CHANGE_INDICATORS = [
    /\b(remove|delete|drop)\s+(api|endpoint|route)/i,
    /\bchange\s+(the\s+)?(api|endpoint|schema|interface|type)/i,
    /\bremove\s+(the\s+)?(field|property|parameter|argument)/i,
    /\brename\s+(the\s+)?(field|property|api|endpoint)/i,
    /\bdeprecate/i,
    /\bmigrat(e|ion)/i,
    /\bschema\s+change/i,
    /\bdata\s+(model|structure)\s+change/i,
    /\bbreaking/i,
    /\brewrite/i,
    /\brefactor\s+(the\s+)?(entire|whole|complete)/i,
    /\breplace\s+(the\s+)?(current|existing)/i,
    /\boverhaul/i,
    /\bchange\s+(the\s+)?(default|behavior|behaviour)/i,
    /\bno\s+longer/i,
    /\bwon't\s+(be\s+)?(compatible|work)/i,
    /\bincompatible/i
  ];

  return BREAKING_CHANGE_INDICATORS.some(pattern => pattern.test(fullText));
}
