# WhatsApp Template Compliance Guide

This guide ensures our WhatsApp template creation follows Meta's strict guidelines and Twilio's best practices.

## Template Categories

### UTILITY
- **Purpose**: Non-promotional, transactional content explicitly requested by users
- **Examples**: Order confirmations, appointment reminders, account status updates
- **Requirements**: Must clearly relate to a user action or agreed transaction
- **Approval**: Generally easier to approve if content matches user expectations

### MARKETING
- **Purpose**: Promotional content, offers, announcements
- **Examples**: Coupon codes, product promotions, newsletters
- **Requirements**: Any template mixing marketing with utility content becomes Marketing
- **Approval**: Higher messaging fees, stricter content review

### AUTHENTICATION
- **Purpose**: One-time passwords (OTP) and verification codes only
- **Examples**: Login verification, 2FA codes
- **Requirements**: Must follow WhatsApp's rigid predefined format
- **Approval**: Very limited scope, cannot customize body text

## Template Structure Rules

### Variables/Placeholders
- **Format**: `{{1}}`, `{{2}}`, `{{3}}`, etc.
- **Maximum**: 10 placeholders per template
- **Numbering**: Must be sequential starting from 1 (no skipping)
- **Positioning**: Cannot start or end template with variables
- **Adjacent**: Cannot have `{{1}}{{2}}` without separating text
- **Sample Values**: Required for approval - must be realistic

### Component Limits

#### Header (Optional)
- **Text Type**: 60 characters max (including variables)
- **Media Type**: IMAGE, VIDEO, or DOCUMENT (≤16MB)
- **Rules**: Single line, can contain variables, rendered in bold

#### Body (Required)
- **Length**: 1024 characters max (after variable substitution)
- **Formatting**: Supports `*bold*`, `_italic_`, `~strikethrough~`, ``` `monospace` ```
- **Variables**: Up to 10 placeholders, must be sequential
- **Whitespace**: Max 2 consecutive newlines, no tabs, max 4 spaces

#### Footer (Optional)
- **Length**: 60 characters max
- **Content**: Plain text only - no variables, emojis, or formatting
- **Purpose**: Disclaimers, brand taglines, legal text

#### Buttons (Optional)
- **Quick Reply**: Up to 3 buttons, 20 chars each, no variables
- **Call-to-Action**: Up to 2 buttons (1 URL + 1 Phone), 20 chars each
- **Restriction**: Cannot mix button types in same template

## Validation Rules

### Content Validation
- ✅ Template name: lowercase, alphanumeric, underscores only
- ✅ No vague content (e.g., "Hello {{1}}, thank you")
- ✅ Language code matches content language
- ✅ Category matches content purpose
- ✅ No WhatsApp-specific links (wa.me, whatsapp://)
- ✅ No excessive whitespace or formatting

### Common Rejection Reasons
- `INVALID_FORMAT`: Variables at start/end, adjacent variables
- `TAG_CONTENT_MISMATCH`: Category doesn't match content
- `LANGUAGE_MISMATCH`: Wrong language code selected
- Content too vague or appears spammy
- Policy violations (illegal content, sensitive data requests)

## API Implementation

### Template Creation Request
```typescript
interface TemplateRequest {
  templateName: string;        // lowercase_with_underscores
  friendlyName?: string;       // Human-readable name
  language: string;           // Exact code: 'en_US', 'es_ES', 'pt_BR'
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  bodyText: string;           // Max 1024 chars, required
  sampleValues?: string[];    // Required for approval if variables exist
  headerText?: string;        // Max 60 chars, optional
  footerText?: string;        // Max 60 chars, no variables
}
```

### Twilio Content Structure
```javascript
{
  "friendly_name": "order_confirmation_en",
  "language": "en_US",
  "types": {
    "twilio/text": {
      "header": {
        "type": "TEXT",
        "text": "Order Update"
      },
      "body": "Hi {{1}}, your order {{2}} has been shipped.",
      "footer": {
        "text": "Thank you for choosing us!"
      }
    }
  },
  "variables": {
    "1": "John Doe",
    "2": "ORD-12345"
  }
}
```

## Best Practices

### Content Guidelines
1. **Be Specific**: Always provide context for variables
2. **Match Category**: Ensure content aligns with selected category
3. **Use Realistic Samples**: Provide meaningful sample values
4. **Follow Formatting**: Use proper markdown for emphasis
5. **Test Thoroughly**: Validate all rules before submission

### Approval Strategy
1. **Start with Utility**: Easier approval for transactional content
2. **Provide Context**: Make clear why user receives message
3. **Use Standard Language**: Avoid slang or ambiguous terms
4. **Include Brand Name**: Help users identify sender
5. **Plan for Rejection**: Have alternative wordings ready

### Error Handling
- Validate all inputs client-side before API call
- Provide clear error messages for validation failures
- Handle Twilio API errors gracefully
- Store templates with approval status tracking
- Implement retry logic for failed approvals

## Language Codes Reference

### Popular Languages
- English US: `en_US`
- English UK: `en_GB`
- Spanish Spain: `es_ES`
- Spanish Mexico: `es_MX`
- Portuguese Brazil: `pt_BR`
- French: `fr`
- German: `de`
- Italian: `it`
- Hindi: `hi`
- Arabic: `ar`

### Regional Variants
Always use specific regional codes when available (e.g., `en_US` instead of `en`) to avoid ambiguity and ensure proper approval.

## Monitoring and Maintenance

### Template Lifecycle
1. **Creation**: API call with proper validation
2. **Submission**: Automatic approval request
3. **Review**: WhatsApp automated/manual review
4. **Approval**: Status changes to 'approved'
5. **Usage**: Send messages using ContentSid
6. **Monitoring**: Track delivery and engagement

### Status Tracking
- `pending`: Submitted for review
- `approved`: Ready for use
- `rejected`: Failed review (check reason)
- `paused`: Temporarily disabled
- `disabled`: Permanently disabled

## Compliance Checklist

Before submitting any template:

- [ ] Template name follows naming convention
- [ ] Content matches selected category
- [ ] Variables are sequential and properly formatted
- [ ] No variables at start/end of message
- [ ] Sample values provided for all variables
- [ ] Character limits respected for all components
- [ ] Language code matches content language
- [ ] No policy violations or prohibited content
- [ ] Clear context provided for user understanding
- [ ] Proper error handling implemented

## Integration with Current System

Our enhanced template creation API now includes:
- ✅ Comprehensive validation following all guidelines
- ✅ Proper Twilio Content API structure
- ✅ Header and footer support
- ✅ Enhanced error messages
- ✅ Sample value validation
- ✅ Character limit enforcement
- ✅ Vague content detection

The system is now fully compliant with Meta's WhatsApp template guidelines and ready for production use.
