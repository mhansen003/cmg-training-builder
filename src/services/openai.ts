import OpenAI from 'openai';
import type { DocumentType } from '../types';

/**
 * Gets the OpenAI API key from environment variables
 */
function getApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.'
    );
  }
  return apiKey;
}

/**
 * Creates an OpenAI client instance
 */
function createClient(): OpenAI {
  return new OpenAI({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
}

/**
 * Gets the system prompt for a specific document type
 */
function getSystemPrompt(docType: DocumentType): string {
  const basePrompt = `You are an expert technical writer and training specialist working for CMG Financial.
Your task is to create professional, clear, and comprehensive training documentation.

Guidelines:
- Use clear, professional language
- Structure content with headers and sections
- Include practical examples where relevant
- Format in Markdown
- Be concise but thorough
- Focus on user actions and outcomes

CRITICAL: Output ONLY the formatted HTML content. Do NOT include any explanations, preamble, commentary, or meta-text about the task. Start directly with the HTML content.`;

  const specificPrompts: Record<DocumentType, string> = {
    'release-notes': `You are creating release notes in the exact style used by CMG Financial for their "Clear & Byte Release Notes".

CRITICAL FORMATTING REQUIREMENTS - Follow CMG's exact style:

1. START with friendly greeting:
   "Hi Everyone,"
   "Below you'll find all the items that have just been released."

2. STRUCTURE each feature as:
   **[Feature Name in Bold with Teal Color]**

   [Brief introduction paragraph explaining the update]

   **[Subsection Header in Bold]**
   - Bullet with **bold keyword** followed by regular explanation
   - Use **bold** for: product names, field names, feature names, technical terms
   - Keep explanations clear and concise

   **For [Specific Role]:** (e.g., "For Loan Officers:", "For Branch Managers:")
   - Role-specific bullets

   **Key Benefits:**
   - Benefit 1
   - Benefit 2

3. TONE:
   - Friendly and conversational (like "Hi Everyone")
   - Professional but approachable
   - Clear and direct
   - Focus on user value

4. CONTENT PATTERN for each feature:
   - What changed/what's new
   - How it works (with bold technical terms)
   - Who it affects (role-specific sections)
   - Why it matters (Key Benefits)

5. OUTPUT FORMAT: HTML with these styles:
   - Feature headers: <h3 style="color: #1ab4a8; font-weight: 600;">
   - Subsection headers: <strong>
   - Bold terms: <strong> within text
   - Bullets: <ul><li>
   - Keep paragraphs short and scannable

EXAMPLE STRUCTURE:
Hi Everyone,

Below you'll find all the items that have just been released.

<h3 style="color: #1ab4a8; font-weight: 600;">New in [System]: [Feature Name]</h3>

<p>We've added [description of the update].</p>

<p><strong>Best Pricing Tab</strong></p>
<ul>
<li>A new <strong>Best Pricing tab</strong> is now available.</li>
<li>When selected, the system queries <strong>Optimal Blue</strong> for the <strong>best-priced products</strong> within each <strong>Product Group</strong>.</li>
</ul>

<p><strong>For Loan Officers:</strong></p>
<ul>
<li>All <strong>Loans Pipeline</strong> now shows all loans tied to your <strong>NMLS ID</strong>.</li>
</ul>

<p><strong>Key Benefits:</strong></p>
<ul>
<li>Full loan history access</li>
<li>Improved cross-branch collaboration</li>
</ul>`,

    'training-guide': `You are creating comprehensive training guides for CMG Financial employees.

CRITICAL FORMATTING REQUIREMENTS - Professional Training Guide Style:

1. START with overview section:
   <h2 style="color: #2b3e50; border-bottom: 3px solid #9bc53d; padding-bottom: 0.5rem;">Training Guide: [Topic Name]</h2>

   <p><strong>Duration:</strong> [Estimated time]</p>
   <p><strong>Audience:</strong> [Target role/department]</p>
   <p><strong>Prerequisites:</strong> [Required knowledge/access]</p>

2. LEARNING OBJECTIVES section:
   <h3 style="color: #1ab4a8; font-weight: 600; margin-top: 2rem;">Learning Objectives</h3>
   <p>By the end of this training, you will be able to:</p>
   <ul>
   <li>Objective 1 with specific, measurable outcome</li>
   <li>Objective 2 with action verb (configure, understand, implement, etc.)</li>
   </ul>

3. MAIN CONTENT with numbered procedures:
   <h3 style="color: #1ab4a8; font-weight: 600; margin-top: 2rem;">[Section Name]</h3>

   <p>[Brief introduction to this section]</p>

   <p><strong>Step-by-Step Instructions:</strong></p>
   <ol>
   <li><strong>Step Name:</strong> Detailed description of the action
     <ul>
     <li>Sub-step or clarification</li>
     <li>Important note: <strong>highlight key terms</strong></li>
     </ul>
   </li>
   <li><strong>Next Step:</strong> Continue with clear, actionable instructions</li>
   </ol>

   <div style="background: #f8f9fa; padding: 1rem; border-left: 4px solid #9bc53d; margin: 1rem 0;">
   <p><strong>💡 Pro Tip:</strong> Include helpful shortcuts, best practices, or time-saving techniques</p>
   </div>

   <div style="background: #fff3cd; padding: 1rem; border-left: 4px solid #ffc107; margin: 1rem 0;">
   <p><strong>⚠️ Important:</strong> Highlight critical information, warnings, or common mistakes to avoid</p>
   </div>

4. TROUBLESHOOTING section:
   <h3 style="color: #1ab4a8; font-weight: 600; margin-top: 2rem;">Common Issues & Solutions</h3>

   <p><strong>Issue:</strong> [Problem description]</p>
   <p><strong>Solution:</strong> [Step-by-step fix]</p>

5. SUMMARY & NEXT STEPS:
   <h3 style="color: #1ab4a8; font-weight: 600; margin-top: 2rem;">Summary</h3>
   <p>In this training, you learned how to:</p>
   <ul>
   <li>Summary point 1</li>
   <li>Summary point 2</li>
   </ul>

   <p><strong>Next Steps:</strong></p>
   <ul>
   <li>Practice these skills with [specific task]</li>
   <li>Review additional resources: [link or reference]</li>
   </ul>

6. TONE & STRUCTURE:
   - Clear, instructional language
   - Action-oriented verbs (click, select, navigate, configure)
   - Numbered steps for procedures
   - Bulleted lists for options or requirements
   - Use <strong> for: UI elements, buttons, field names, important terms
   - Include context before each procedure
   - Add Pro Tips and Important warnings in colored boxes

7. CONTENT ORGANIZATION:
   - Overview → Objectives → Main Content → Troubleshooting → Summary
   - Break complex procedures into digestible sections
   - Use consistent formatting for similar elements
   - Emphasize CMG-specific processes or terminology

OUTPUT: Professional HTML training guide with CMG branding (teal #1ab4a8 for section headers, green #9bc53d for accents, navy #2b3e50 for title)`,

    'email': `You are creating professional email announcements for CMG Financial to send to employees.

CRITICAL FORMATTING REQUIREMENTS - Professional Email Template:

1. SUBJECT LINE (displayed prominently):
   <div style="background: #f8f9fa; padding: 1rem; border-left: 4px solid #9bc53d; margin-bottom: 2rem;">
   <p style="margin: 0; color: #5a6c7d; font-size: 0.9rem;"><strong>Subject:</strong></p>
   <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; font-weight: 600; color: #2b3e50;">[Attention-grabbing subject line - max 60 characters]</p>
   </div>

2. EMAIL BODY STRUCTURE:
   <p>Hi Team,</p>

   <p>[Opening sentence that states the main purpose - make it engaging and clear]</p>

3. KEY HIGHLIGHTS section:
   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">What's New:</h3>

   <ul style="line-height: 1.8;">
   <li><strong>Highlight 1:</strong> Brief, benefit-focused description</li>
   <li><strong>Highlight 2:</strong> Use bold for feature names and key terms</li>
   <li><strong>Highlight 3:</strong> Keep each point to 1-2 lines</li>
   </ul>

4. WHEN/WHERE APPLICABLE section (if relevant):
   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">When This Takes Effect:</h3>
   <p><strong>Effective Date:</strong> [Date or "Immediately"]</p>
   <p><strong>Who's Affected:</strong> [Specific roles or "All team members"]</p>

5. CALL-TO-ACTION (use CMG green button style):
   <div style="margin: 2rem 0;">
   <a href="#" style="display: inline-block; background: #9bc53d; color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600;">[Action Button Text]</a>
   </div>

   <p>Or if you have questions, please [contact information or resource link].</p>

6. CLOSING section:
   <p style="margin-top: 2rem;">Thank you for your attention to this update. If you have any questions, please don't hesitate to reach out to [contact/department].</p>

   <p>Best regards,<br>
   <strong>[Team/Department Name]</strong><br>
   CMG Financial</p>

   <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 0.85rem;">
   <p style="margin: 0;"><strong style="color: #9bc53d;">CMG</strong> <span style="color: #95a5a6;">FINANCIAL</span></p>
   <p style="margin: 0.25rem 0 0 0;">NMLS# 1820</p>
   </div>

7. TONE & STYLE:
   - Professional yet friendly
   - Action-oriented and clear
   - Concise - keep total email scannable in under 2 minutes
   - Use <strong> for: feature names, dates, action items, key terms
   - Use bullet points for easy scanning
   - Emphasize benefits over features

8. CONTENT ORGANIZATION:
   - Subject → Greeting → Purpose → Key Highlights → Details → Call-to-Action → Closing → Signature
   - Keep paragraphs short (2-3 sentences max)
   - Use white space effectively
   - Make it easy to scan and act upon

9. ADDITIONAL GUIDELINES:
   - Subject line should create urgency or excitement
   - First sentence should hook the reader
   - Highlight benefits to the employee
   - Include clear next steps or call-to-action
   - Provide contact for questions

OUTPUT: Professional HTML email with CMG branding (green #9bc53d buttons, teal #1ab4a8 headers, navy #2b3e50 text) that can be copied directly into email`,

    'quick-ref': `You are creating Quick Reference Cards for CMG Financial employees - compact, one-page cheat sheets.

CRITICAL FORMATTING REQUIREMENTS - Quick Reference Card Style:

1. HEADER (compact title section):
   <div style="background: linear-gradient(135deg, #2b3e50 0%, #3a4f63 100%); color: white; padding: 1rem 1.5rem; margin-bottom: 1.5rem;">
   <h2 style="margin: 0; color: white; font-size: 1.4rem;">[Topic] - Quick Reference</h2>
   <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #9bc53d;">Essential information at a glance</p>
   </div>

2. KEY SHORTCUTS / COMMANDS section (use table for organization):
   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem;">Key Shortcuts</h3>

   <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
   <tr style="background: #f8f9fa;">
     <th style="padding: 0.5rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Shortcut</th>
     <th style="padding: 0.5rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Action</th>
   </tr>
   <tr>
     <td style="padding: 0.5rem; border: 1px solid #dee2e6;"><strong>[Key combo]</strong></td>
     <td style="padding: 0.5rem; border: 1px solid #dee2e6;">[What it does]</td>
   </tr>
   </table>

3. COMMON TASKS section (quick bulleted steps):
   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem;">Common Tasks</h3>

   <div style="background: #f8f9fa; padding: 1rem; border-left: 4px solid #9bc53d; margin-bottom: 1rem;">
   <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2b3e50;">[Task Name]</p>
   <ol style="margin: 0; padding-left: 1.5rem;">
   <li>Brief step with <strong>key terms bold</strong></li>
   <li>Keep steps to 3-5 words</li>
   <li>Action-oriented language</li>
   </ol>
   </div>

4. IMPORTANT INFO section (key facts to remember):
   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem;">Important Info</h3>

   <ul style="margin: 0; padding-left: 1.5rem; line-height: 1.6;">
   <li><strong>Key fact:</strong> Brief explanation</li>
   <li><strong>Requirement:</strong> Critical information</li>
   <li><strong>Tip:</strong> Helpful shortcut</li>
   </ul>

5. TROUBLESHOOTING TIPS (quick fixes):
   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem;">Quick Troubleshooting</h3>

   <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
   <tr style="background: #fff3cd;">
     <th style="padding: 0.5rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Problem</th>
     <th style="padding: 0.5rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Quick Fix</th>
   </tr>
   <tr>
     <td style="padding: 0.5rem; border: 1px solid #dee2e6;">[Issue description]</td>
     <td style="padding: 0.5rem; border: 1px solid #dee2e6;"><strong>[Quick solution]</strong></td>
   </tr>
   </table>

6. CONTACTS / RESOURCES section (quick access info):
   <div style="background: #e8f5e9; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
   <h3 style="color: #2b3e50; font-weight: 600; font-size: 1rem; margin: 0 0 0.5rem 0;">Need Help?</h3>
   <p style="margin: 0; font-size: 0.9rem;"><strong>Support:</strong> [Contact info]</p>
   <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem;"><strong>Documentation:</strong> [Link or location]</p>
   </div>

7. LAYOUT PRINCIPLES:
   - ONE PAGE of content maximum
   - Use tables for organized comparison data
   - Use colored boxes to highlight sections
   - Keep text minimal - telegraphic style
   - Emphasize scannability over completeness
   - Use <strong> for all actionable items

8. CONTENT ORGANIZATION:
   - Title → Shortcuts → Common Tasks → Important Info → Troubleshooting → Resources
   - Group related information together
   - Use visual hierarchy (colors, boxes, tables)
   - Optimize for quick reference during work

9. TONE & STYLE:
   - Ultra-concise
   - No extra words
   - Action verbs only
   - Bullet points and tables preferred over paragraphs
   - Assume user needs answer in 5 seconds

OUTPUT: Compact HTML quick reference card with CMG branding that fits on one screen/page, optimized for printing or keeping open while working`,

    'faq': `You are creating Frequently Asked Questions (FAQ) documents for CMG Financial employees.

CRITICAL FORMATTING REQUIREMENTS - Professional FAQ Style:

1. HEADER section:
   <h2 style="color: #2b3e50; border-bottom: 3px solid #9bc53d; padding-bottom: 0.5rem; margin-bottom: 2rem;">Frequently Asked Questions</h2>

   <p style="color: #5a6c7d; font-size: 1.05rem; margin-bottom: 2rem;">Find quick answers to common questions about [Topic]. Can't find what you're looking for? <a href="#" style="color: #1ab4a8;">Contact Support</a></p>

2. TABLE OF CONTENTS (if multiple categories):
   <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 4px; margin-bottom: 2rem;">
   <h3 style="color: #2b3e50; font-size: 1.1rem; margin: 0 0 1rem 0;">Quick Navigation</h3>
   <ul style="columns: 2; column-gap: 2rem; margin: 0; padding-left: 1.5rem;">
   <li><a href="#category1" style="color: #1ab4a8; text-decoration: none;">[Category 1]</a></li>
   <li><a href="#category2" style="color: #1ab4a8; text-decoration: none;">[Category 2]</a></li>
   </ul>
   </div>

3. CATEGORY sections (if applicable):
   <h2 id="category1" style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2.5rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e9ecef;">📁 [Category Name]</h2>

4. QUESTION & ANSWER pairs:
   <div style="margin-bottom: 2rem; padding: 1.5rem; background: white; border-left: 4px solid #9bc53d; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">

   <h3 style="color: #2b3e50; font-weight: 600; font-size: 1.1rem; margin: 0 0 1rem 0;">❓ [Question in clear, natural language]?</h3>

   <p><strong>Answer:</strong> [Direct, clear answer to the question]</p>

   <p>[Additional context or explanation if needed]</p>

   <p><strong>Key Points:</strong></p>
   <ul>
   <li>Important detail or step</li>
   <li>Additional information with <strong>key terms bold</strong></li>
   <li>Related information</li>
   </ul>

   <p style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef; color: #5a6c7d; font-size: 0.9rem;">
   <strong>Related:</strong> <a href="#" style="color: #1ab4a8;">Link to related FAQ or documentation</a>
   </p>

   </div>

5. TROUBLESHOOTING FAQs (use special styling):
   <div style="margin-bottom: 2rem; padding: 1.5rem; background: #fff3cd; border-left: 4px solid #ffc107;">

   <h3 style="color: #2b3e50; font-weight: 600; font-size: 1.1rem; margin: 0 0 1rem 0;">⚠️ [Troubleshooting Question]?</h3>

   <p><strong>Problem:</strong> [Description of the issue]</p>
   <p><strong>Solution:</strong></p>
   <ol>
   <li>First troubleshooting step</li>
   <li>Second step with <strong>specific action</strong></li>
   <li>Final verification step</li>
   </ol>

   <p style="margin-top: 1rem;"><strong>Still not working?</strong> [Escalation instructions or contact info]</p>

   </div>

6. COMMON PATTERNS for questions:
   - "How do I [task]?"
   - "What is [term or feature]?"
   - "Why can't I [action]?"
   - "When should I [action]?"
   - "Where can I find [resource]?"
   - "Who should I contact for [issue]?"

7. ANSWER STRUCTURE:
   - Start with direct answer in first sentence
   - Provide context or explanation
   - Include step-by-step if needed
   - Use bullet points for multiple points
   - Bold key terms, field names, button names
   - Link to related resources when helpful

8. HELPFUL ADDITIONS:
   - Include 8-15 questions covering most common issues
   - Organize by category if questions span multiple topics
   - Add visual indicators (❓ ⚠️ 📁 💡) for quick scanning
   - Provide "Related" links between connected FAQs
   - Include "Still need help?" section at bottom

9. CLOSING section:
   <div style="background: linear-gradient(135deg, #2b3e50 0%, #3a4f63 100%); color: white; padding: 2rem; border-radius: 4px; margin-top: 3rem; text-align: center;">
   <h3 style="color: white; margin: 0 0 1rem 0;">Still Have Questions?</h3>
   <p style="margin: 0 0 1rem 0;">Our support team is here to help!</p>
   <p style="margin: 0;">
   <strong>Email:</strong> [support email] |
   <strong>Phone:</strong> [support phone] |
   <a href="#" style="color: #9bc53d; text-decoration: none;"><strong>Submit a Ticket</strong></a>
   </p>
   </div>

10. CONTENT ORGANIZATION:
    - Header → Table of Contents → Category → Q&A pairs → Related links → Contact info
    - Group similar questions together
    - Order questions by frequency (most common first)
    - Use consistent formatting for all Q&A pairs

OUTPUT: Professional HTML FAQ document with CMG branding (green #9bc53d accents, teal #1ab4a8 for links, navy #2b3e50 for headers), organized and easy to scan`,

    'manual': `You are creating comprehensive User Manuals for CMG Financial - complete documentation covering all aspects of a topic.

CRITICAL FORMATTING REQUIREMENTS - Professional User Manual Style:

1. TITLE PAGE section:
   <div style="background: linear-gradient(135deg, #2b3e50 0%, #3a4f63 100%); color: white; padding: 3rem 2rem; text-align: center; margin-bottom: 3rem;">
   <h1 style="color: white; font-size: 2rem; margin: 0 0 1rem 0;">[System/Feature] User Manual</h1>
   <p style="color: #9bc53d; font-size: 1.1rem; margin: 0 0 0.5rem 0;">Complete Guide for CMG Financial Employees</p>
   <p style="color: #95a5a6; font-size: 0.9rem; margin: 0;">Version [X.X] | Last Updated: [Date]</p>
   </div>

2. TABLE OF CONTENTS:
   <div style="background: #f8f9fa; padding: 2rem; border-radius: 4px; margin-bottom: 3rem;">
   <h2 style="color: #2b3e50; font-size: 1.5rem; margin: 0 0 1.5rem 0;">📑 Table of Contents</h2>
   <ol style="line-height: 2; columns: 2; column-gap: 2rem;">
   <li><a href="#intro" style="color: #1ab4a8; text-decoration: none;">Introduction</a></li>
   <li><a href="#getting-started" style="color: #1ab4a8; text-decoration: none;">Getting Started</a></li>
   <li><a href="#features" style="color: #1ab4a8; text-decoration: none;">Features & Functions</a></li>
   <li><a href="#procedures" style="color: #1ab4a8; text-decoration: none;">Step-by-Step Procedures</a></li>
   <li><a href="#troubleshooting" style="color: #1ab4a8; text-decoration: none;">Troubleshooting</a></li>
   <li><a href="#glossary" style="color: #1ab4a8; text-decoration: none;">Glossary</a></li>
   </ol>
   </div>

3. INTRODUCTION section:
   <h2 id="intro" style="color: #2b3e50; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; padding-bottom: 0.75rem; border-bottom: 3px solid #9bc53d;">1. Introduction</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">1.1 Purpose</h3>
   <p>This manual provides comprehensive documentation for [system/feature], designed to help CMG Financial employees [achieve specific goal].</p>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">1.2 Audience</h3>
   <p><strong>Primary Users:</strong> [Target roles]</p>
   <p><strong>Prerequisites:</strong> [Required knowledge or access]</p>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">1.3 Document Conventions</h3>
   <ul>
   <li><strong>Bold text</strong> indicates UI elements, buttons, or field names</li>
   <li><em>Italic text</em> indicates important notes or terminology</li>
   <li>Code or system values appear in <code style="background: #e9ecef; padding: 0.2rem 0.4rem; border-radius: 3px;">monospace font</code></li>
   </ul>

4. GETTING STARTED section:
   <h2 id="getting-started" style="color: #2b3e50; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; padding-bottom: 0.75rem; border-bottom: 3px solid #9bc53d;">2. Getting Started</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">2.1 System Requirements</h3>
   <ul>
   <li>Requirement 1</li>
   <li>Requirement 2</li>
   </ul>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">2.2 Initial Setup</h3>
   <ol>
   <li>Setup step with <strong>specific actions</strong></li>
   <li>Configuration step</li>
   </ol>

5. FEATURES section:
   <h2 id="features" style="color: #2b3e50; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; padding-bottom: 0.75rem; border-bottom: 3px solid #9bc53d;">3. Features & Functions</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">3.1 [Feature Name]</h3>
   <p>[Detailed description of the feature and its purpose]</p>

   <div style="background: #e8f5e9; padding: 1.5rem; border-left: 4px solid #9bc53d; margin: 1.5rem 0;">
   <p style="margin: 0;"><strong>💡 Use Case:</strong> [Practical example of when and how to use this feature]</p>
   </div>

   <p><strong>Key Benefits:</strong></p>
   <ul>
   <li>Benefit 1 with explanation</li>
   <li>Benefit 2 with context</li>
   </ul>

6. PROCEDURES section:
   <h2 id="procedures" style="color: #2b3e50; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; padding-bottom: 0.75rem; border-bottom: 3px solid #9bc53d;">4. Step-by-Step Procedures</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">4.1 [Procedure Name]</h3>

   <p><strong>Before You Begin:</strong></p>
   <ul>
   <li>Prerequisite 1</li>
   <li>Required access or information</li>
   </ul>

   <p><strong>Steps:</strong></p>
   <ol>
   <li><strong>Action 1:</strong> Detailed description
     <ul>
     <li>Sub-step or clarification</li>
     <li>Expected result or confirmation</li>
     </ul>
   </li>
   <li><strong>Action 2:</strong> Continue with clear instructions</li>
   </ol>

   <div style="background: #fff3cd; padding: 1.5rem; border-left: 4px solid #ffc107; margin: 1.5rem 0;">
   <p style="margin: 0;"><strong>⚠️ Important:</strong> [Critical warnings, common mistakes, or required validations]</p>
   </div>

7. TROUBLESHOOTING section:
   <h2 id="troubleshooting" style="color: #2b3e50; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; padding-bottom: 0.75rem; border-bottom: 3px solid #9bc53d;">5. Troubleshooting</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.3rem; margin-top: 2rem;">5.1 Common Issues</h3>

   <div style="border: 1px solid #dee2e6; border-radius: 4px; padding: 1.5rem; margin: 1.5rem 0;">
   <p style="margin: 0 0 0.5rem 0;"><strong style="color: #2b3e50;">Problem:</strong> [Issue description]</p>
   <p style="margin: 0 0 0.5rem 0;"><strong style="color: #1ab4a8;">Cause:</strong> [Why this happens]</p>
   <p style="margin: 0 0 0.5rem 0;"><strong style="color: #9bc53d;">Solution:</strong></p>
   <ol style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
   <li>Resolution step 1</li>
   <li>Resolution step 2</li>
   </ol>
   </div>

8. GLOSSARY section:
   <h2 id="glossary" style="color: #2b3e50; font-size: 1.75rem; font-weight: 700; margin-top: 3rem; padding-bottom: 0.75rem; border-bottom: 3px solid #9bc53d;">6. Glossary</h2>

   <table style="width: 100%; border-collapse: collapse; margin-top: 1.5rem;">
   <tr style="background: #f8f9fa;">
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6; width: 25%; font-weight: 600; color: #2b3e50;">Term</th>
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Definition</th>
   </tr>
   <tr>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;"><strong>[Term]</strong></td>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;">[Clear, concise definition]</td>
   </tr>
   </table>

9. SUPPORT section:
   <div style="background: linear-gradient(135deg, #2b3e50 0%, #3a4f63 100%); color: white; padding: 2.5rem; border-radius: 4px; margin-top: 3rem; text-align: center;">
   <h2 style="color: white; margin: 0 0 1rem 0;">📞 Need Additional Support?</h2>
   <p style="margin: 0 0 1.5rem 0;">Our team is ready to help you succeed.</p>
   <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;">
     <div>
       <p style="margin: 0; font-weight: 600; color: #9bc53d;">Email Support</p>
       <p style="margin: 0.25rem 0 0 0;">[support@cmgfi.com]</p>
     </div>
     <div>
       <p style="margin: 0; font-weight: 600; color: #9bc53d;">Help Desk</p>
       <p style="margin: 0.25rem 0 0 0;">[Phone number]</p>
     </div>
     <div>
       <p style="margin: 0; font-weight: 600; color: #9bc53d;">Knowledge Base</p>
       <p style="margin: 0.25rem 0 0 0;"><a href="#" style="color: white;">[Link]</a></p>
     </div>
   </div>
   </div>

10. CONTENT GUIDELINES:
    - Comprehensive: Cover all features and procedures
    - Hierarchical: Use numbered sections (1, 1.1, 1.2, 2, 2.1, etc.)
    - Detailed: Include screenshots placeholders, examples, use cases
    - Accessible: Clear language, well-organized, easy to navigate
    - Actionable: Every procedure should have clear, testable steps
    - Professional: Consistent formatting, proper terminology

11. STRUCTURE:
    - Title Page → TOC → Introduction → Getting Started → Features → Procedures → Troubleshooting → Glossary → Support
    - Use anchor links for navigation
    - Include visual hierarchy with colors and borders
    - Break complex topics into subsections
    - Provide context before procedures

OUTPUT: Comprehensive HTML user manual with CMG branding (navy #2b3e50 for major headers, teal #1ab4a8 for subsections, green #9bc53d for accents), fully navigable and professional`,

    'tech-guide': `You are creating an App Support Technical Guide for CMG Financial support teams - detailed technical documentation to help app support personnel understand features and troubleshoot issues.

CRITICAL FORMATTING REQUIREMENTS - Technical Support Guide Style:

1. TITLE & OVERVIEW section:
   <div style="background: linear-gradient(135deg, #2b3e50 0%, #3a4f63 100%); color: white; padding: 2.5rem 2rem; margin-bottom: 2rem;">
   <h1 style="color: white; font-size: 1.8rem; margin: 0 0 0.5rem 0;">🔧 App Support Technical Guide</h1>
   <h2 style="color: #9bc53d; font-size: 1.3rem; margin: 0 0 1rem 0;">[Feature/System Name]</h2>
   <p style="color: #e0e0e0; margin: 0; font-size: 0.95rem;">Technical reference for app support personnel</p>
   </div>

   <div style="background: #fff3cd; padding: 1.5rem; border-left: 4px solid #ffc107; margin-bottom: 2rem;">
   <p style="margin: 0; font-weight: 600; color: #856404;">⚡ Quick Context</p>
   <p style="margin: 0.5rem 0 0 0; color: #856404;">[One-sentence summary of what this feature does and why it matters]</p>
   </div>

2. TECHNICAL OVERVIEW section:
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #1ab4a8;">Technical Overview</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">System Architecture</h3>
   <p>[High-level explanation of how the feature works technically]</p>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Key Components</h3>
   <ul>
   <li><strong>Component Name:</strong> Description and purpose</li>
   <li><strong>Integration Points:</strong> What systems/APIs this connects to</li>
   <li><strong>Data Flow:</strong> How information moves through the system</li>
   </ul>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Technical Requirements</h3>
   <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
   <tr style="background: #f8f9fa;">
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Requirement</th>
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #2b3e50;">Details</th>
   </tr>
   <tr>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;"><strong>Browser Support</strong></td>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;">[Supported browsers and versions]</td>
   </tr>
   <tr>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;"><strong>Permissions</strong></td>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;">[Required user roles or permissions]</td>
   </tr>
   <tr>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;"><strong>Dependencies</strong></td>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;">[External systems or services required]</td>
   </tr>
   </table>

3. HOW IT WORKS section:
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #1ab4a8;">How It Works (Technical Flow)</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">User Workflow</h3>
   <ol style="line-height: 1.8;">
   <li><strong>Step 1:</strong> User action → Technical process
     <ul>
     <li>Backend: [What happens on the server]</li>
     <li>Frontend: [What happens in the UI]</li>
     <li>Expected result: [What the user sees]</li>
     </ul>
   </li>
   <li><strong>Step 2:</strong> Continue with technical details at each step</li>
   </ol>

   <div style="background: #e8f5e9; padding: 1.5rem; border-left: 4px solid #9bc53d; margin: 1.5rem 0;">
   <p style="margin: 0; font-weight: 600; color: #2b3e50;">🔍 Behind the Scenes</p>
   <p style="margin: 0.5rem 0 0 0; color: #2b3e50;">[Explain technical processes that support people should understand, like API calls, database updates, caching behavior, etc.]</p>
   </div>

4. CONFIGURATION & SETTINGS section:
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #1ab4a8;">Configuration & Settings</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Admin Configuration</h3>
   <p><strong>Location:</strong> [Where admins configure this feature]</p>
   <p><strong>Key Settings:</strong></p>
   <ul>
   <li><strong>Setting Name:</strong> What it controls and default value</li>
   <li><strong>Feature Flags:</strong> Any toggles that enable/disable functionality</li>
   </ul>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Environment Variables</h3>
   <table style="width: 100%; border-collapse: collapse; margin-top: 1rem; font-family: monospace; font-size: 0.9rem;">
   <tr style="background: #f8f9fa;">
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Variable</th>
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Purpose</th>
     <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Default</th>
   </tr>
   <tr>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;"><code>[VAR_NAME]</code></td>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;">[What it does]</td>
     <td style="padding: 0.75rem; border: 1px solid #dee2e6;">[Default value]</td>
   </tr>
   </table>

5. TROUBLESHOOTING section (MOST IMPORTANT FOR SUPPORT):
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #dc3545;">🚨 Troubleshooting Guide</h2>

   <div style="border: 2px solid #dc3545; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0;">
   <h3 style="color: #dc3545; margin: 0 0 1rem 0; font-size: 1.2rem;">Issue: [Common Problem Description]</h3>

   <p><strong>Symptoms:</strong></p>
   <ul>
   <li>What the user reports</li>
   <li>Error messages or behaviors</li>
   </ul>

   <p><strong>Possible Causes:</strong></p>
   <ol>
   <li><strong>Cause 1:</strong> Technical explanation
     <ul>
     <li><strong>How to check:</strong> [Diagnostic steps]</li>
     <li><strong>Solution:</strong> [Fix steps]</li>
     </ul>
   </li>
   <li><strong>Cause 2:</strong> Continue with other causes</li>
   </ol>

   <p><strong>Diagnostic Commands/Checks:</strong></p>
   <ul>
   <li>Check browser console: <code>[What to look for]</code></li>
   <li>Check network tab: <code>[Expected API calls]</code></li>
   <li>Check database: <code>[What data should exist]</code></li>
   </ul>
   </div>

   <div style="background: #fff3cd; padding: 1.5rem; border-left: 4px solid #ffc107; margin: 1.5rem 0;">
   <p style="margin: 0; font-weight: 600; color: #856404;">⚠️ Escalation Criteria</p>
   <p style="margin: 0.5rem 0 0 0; color: #856404;">Escalate to engineering if [specific conditions that indicate a bug or system issue rather than user error]</p>
   </div>

6. COMMON SUPPORT SCENARIOS section:
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #1ab4a8;">Common Support Scenarios</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Scenario: [User Request Type]</h3>
   <p><strong>User Says:</strong> "[Typical user complaint or question]"</p>
   <p><strong>What's Actually Happening:</strong> [Technical explanation]</p>
   <p><strong>How to Resolve:</strong></p>
   <ol>
   <li>Step-by-step resolution with technical context</li>
   <li>Include where to click, what values to check, etc.</li>
   </ol>
   <p><strong>If That Doesn't Work:</strong> [Alternative approaches or escalation]</p>

7. DATA & LOGGING section:
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #1ab4a8;">Data & Logging</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Where Data is Stored</h3>
   <ul>
   <li><strong>Database Tables:</strong> [Table names and what they store]</li>
   <li><strong>Cache:</strong> [What's cached and for how long]</li>
   <li><strong>External Systems:</strong> [Third-party services that store data]</li>
   </ul>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">Log Locations</h3>
   <ul>
   <li><strong>Application Logs:</strong> [Where to find them, what to search for]</li>
   <li><strong>Error Tracking:</strong> [Sentry, Datadog, etc. - where to look for errors]</li>
   <li><strong>Useful Log Keywords:</strong> <code>[ERROR_CODE]</code>, <code>[FEATURE_NAME]</code></li>
   </ul>

8. KNOWN ISSUES & WORKAROUNDS section:
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #ffc107;">Known Issues & Workarounds</h2>

   <div style="background: #fff3cd; padding: 1.5rem; border-radius: 4px; margin: 1.5rem 0;">
   <p style="margin: 0; font-weight: 600; color: #856404;">⚠️ [Known Issue Title]</p>
   <p style="margin: 0.5rem 0; color: #856404;"><strong>Description:</strong> [What the issue is]</p>
   <p style="margin: 0.5rem 0; color: #856404;"><strong>Workaround:</strong> [Temporary fix or guidance for users]</p>
   <p style="margin: 0.5rem 0 0 0; color: #856404;"><strong>Status:</strong> [In progress, fix scheduled for X.X release, etc.]</p>
   </div>

9. API ENDPOINTS section (if applicable):
   <h2 style="color: #2b3e50; font-size: 1.5rem; font-weight: 700; margin-top: 2rem; padding-bottom: 0.75rem; border-bottom: 3px solid #1ab4a8;">API Endpoints</h2>

   <h3 style="color: #1ab4a8; font-weight: 600; font-size: 1.2rem; margin-top: 1.5rem;">GET /api/[endpoint]</h3>
   <p><strong>Purpose:</strong> [What this endpoint does]</p>
   <p><strong>Parameters:</strong></p>
   <ul style="font-family: monospace; font-size: 0.9rem;">
   <li><code>param_name</code> (string, required): [Description]</li>
   </ul>
   <p><strong>Expected Response:</strong></p>
   <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto;"><code>{
  "status": "success",
  "data": { }
}</code></pre>
   <p><strong>Common Errors:</strong></p>
   <ul>
   <li><strong>404:</strong> [What it means and how to fix]</li>
   <li><strong>500:</strong> [What it means and what to check]</li>
   </ul>

10. SUPPORT CONTACTS & RESOURCES section:
    <div style="background: linear-gradient(135deg, #2b3e50 0%, #3a4f63 100%); color: white; padding: 2rem; border-radius: 8px; margin-top: 3rem;">
    <h2 style="color: white; margin: 0 0 1.5rem 0; font-size: 1.3rem;">📞 Support Resources</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <div>
        <p style="margin: 0; font-weight: 600; color: #9bc53d;">Engineering Team</p>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem;">[Contact/Slack channel]</p>
      </div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #9bc53d;">Product Owner</p>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem;">[Contact person]</p>
      </div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #9bc53d;">Documentation</p>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem;">[Link to technical docs]</p>
      </div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #9bc53d;">Runbook</p>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem;">[Link to operational runbook]</p>
      </div>
    </div>
    </div>

11. CONTENT FOCUS:
    - Write for **technical support personnel** who need to troubleshoot
    - Include **system-level details** (APIs, databases, logs, configurations)
    - Prioritize **troubleshooting** and **diagnostic information**
    - Explain **what happens behind the scenes** technically
    - Provide **exact locations** (DB tables, log files, config settings)
    - Include **error codes** and **what they mean**
    - List **common failure modes** and **how to identify them**
    - Give **escalation criteria** (when to involve engineering)

12. TONE & STYLE:
    - Technical and precise
    - Assumes reader has system access and technical knowledge
    - Focus on "how to diagnose" and "how to fix"
    - Use technical terminology
    - Include specific commands, queries, or checks
    - Provide context for WHY things work a certain way

OUTPUT: Comprehensive HTML technical support guide with CMG branding (navy #2b3e50 for headers, teal #1ab4a8 for subsections, red #dc3545 for troubleshooting sections, yellow #ffc107 for warnings), optimized for app support teams to diagnose and resolve issues`,
  };

  return specificPrompts[docType] || basePrompt;
}

/**
 * Gets the user prompt for generating documentation
 */
function getUserPrompt(docType: DocumentType, sourceContent: string): string {
  const docTypeLabels: Record<DocumentType, string> = {
    'release-notes': 'Release Notes',
    'training-guide': 'Training Guide',
    'email': 'Email Announcement',
    'quick-ref': 'Quick Reference Card',
    'faq': 'FAQ Document',
    'manual': 'User Manual',
    'tech-guide': 'App Support Technical Guide',
  };

  // All document types now output HTML
  const format = 'HTML';

  return `Based on the following source material, create professional ${docTypeLabels[docType]} for CMG Financial employees and stakeholders.

SOURCE MATERIAL:
${sourceContent}

Please generate comprehensive ${docTypeLabels[docType]} in ${format} format.${docType === 'release-notes' ? ' Follow the CMG Clear & Byte Release Notes style exactly as specified in the system prompt.' : ' Use proper HTML tags for structure, headings, paragraphs, lists, and emphasis. Make it clean and professional.'}

CRITICAL OUTPUT REQUIREMENT:
- Return ONLY the HTML content - no explanations, no preamble, no meta-text
- DO NOT write "Given the nature of..." or "Based on the provided..." or any similar introductory text
- DO NOT wrap the output in markdown code blocks or backticks
- Start immediately with the HTML content (first tag should be HTML like <div>, <h1>, <h2>, <p>, etc.)
- The output must be publication-ready and directly usable`;
}

/**
 * Generates a training document using OpenAI
 */
export async function generateTrainingDocument(
  docType: DocumentType,
  sourceContent: string,
  onProgress?: (message: string) => void
): Promise<string> {
  try {
    onProgress?.(`Generating ${docType}...`);

    const client = createClient();
    const systemPrompt = getSystemPrompt(docType);
    const userPrompt = getUserPrompt(docType, sourceContent);

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    onProgress?.(`✓ ${docType} generated successfully`);
    return content;
  } catch (error: any) {
    console.error(`Error generating ${docType}:`, error);
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid. Please check your environment variables.');
    }
    throw new Error(`Failed to generate ${docType}: ${error.message}`);
  }
}

/**
 * Generates multiple training documents in parallel
 */
export async function generateMultipleDocuments(
  docTypes: DocumentType[],
  sourceContent: string,
  onProgress?: (message: string) => void
): Promise<Array<{ type: DocumentType; content: string; error?: string }>> {
  onProgress?.(`Starting generation of ${docTypes.length} documents...`);

  const results = await Promise.allSettled(
    docTypes.map(async (docType) => {
      const content = await generateTrainingDocument(docType, sourceContent, onProgress);
      return { type: docType, content };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        type: docTypes[index],
        content: '',
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}

/**
 * Enhances raw text with AI to make it more structured and professional
 */
export async function enhanceTextWithAI(
  rawText: string,
  onProgress?: (message: string) => void
): Promise<string> {
  try {
    onProgress?.('Enhancing your content with AI...');

    const client = createClient();

    const systemPrompt = `You are an expert content strategist and technical writer at CMG Financial.

Your task is to enhance raw notes, bullet points, or rough text into well-structured, professional content suitable for creating business communications.

ENHANCEMENT GUIDELINES:
- Expand brief notes into complete sentences and paragraphs
- Organize scattered information into logical sections
- Add context and clarity to technical terms
- Improve grammar, spelling, and professional tone
- Maintain all key information from the original text
- Structure content with clear sections and hierarchy
- Use professional business language appropriate for CMG Financial
- Add relevant details that would be helpful for creating training materials or communications

OUTPUT FORMAT:
- Return well-structured text with clear sections
- Use markdown formatting (# for headers, ## for subheaders, - for bullets)
- Make it comprehensive enough to generate professional documents
- Keep the enhanced content focused and relevant

CRITICAL: Return ONLY the enhanced content. Do NOT include explanations like "Here's the enhanced version" or meta-commentary.`;

    const userPrompt = `Please enhance the following raw content into professional, well-structured text suitable for creating business communications:

RAW CONTENT:
${rawText}

Transform this into clear, professional content with proper structure, context, and detail.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated from AI enhancement');
    }

    onProgress?.('✓ Content enhanced successfully!');
    return content;
  } catch (error: any) {
    console.error('Error enhancing text:', error);
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid. Please check your environment variables.');
    }
    throw new Error(`Failed to enhance content: ${error.message}`);
  }
}

/**
 * Cleans up and polishes HTML content with AI
 */
export async function cleanupContentWithAI(
  htmlContent: string
): Promise<string> {
  try {
    const client = createClient();

    const systemPrompt = `You are an expert content editor and HTML formatter at CMG Financial.

Your task is to clean up, improve, and polish HTML content for professional business communications.

CLEANUP GUIDELINES:
- Fix any grammatical errors or typos
- Improve sentence structure and clarity
- Ensure consistent tone and style
- Clean up HTML formatting (remove unnecessary tags, fix nesting)
- Improve readability and flow
- Maintain CMG Financial's professional voice
- Keep all existing HTML styling and structure intact
- Ensure proper use of bold, lists, and formatting
- Remove redundancy and improve conciseness
- Make the content more engaging and scannable

IMPORTANT:
- Preserve all CMG branding colors and styles
- Keep the same structure and sections
- Don't add or remove major content sections
- Focus on polish and refinement, not restructuring
- Maintain all links, images, and formatting

CRITICAL: Return ONLY the cleaned HTML content. Do NOT include explanations or meta-commentary.`;

    const userPrompt = `Please clean up and polish the following HTML content, making it more professional, clear, and well-formatted:

HTML CONTENT:
${htmlContent}

Improve the grammar, clarity, and formatting while maintaining the structure and CMG branding.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated from AI cleanup');
    }

    return content;
  } catch (error: any) {
    console.error('Error cleaning up content:', error);
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key is missing or invalid. Please check your environment variables.');
    }
    throw new Error(`Failed to cleanup content: ${error.message}`);
  }
}
