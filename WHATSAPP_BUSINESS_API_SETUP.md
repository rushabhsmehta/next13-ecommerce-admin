# WhatsApp Business API Setup Guide

## Overview
To create WhatsApp templates, you need to set up WhatsApp Business API credentials through Meta Business Manager. This guide will walk you through the process.

## Prerequisites
1. Facebook Business Account
2. WhatsApp Business Account
3. Verified phone number
4. Meta Business Manager access

## Step 1: Set up Meta Business Manager

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Create a business account if you don't have one
3. Verify your business information

## Step 2: Set up WhatsApp Business API

1. In Meta Business Manager, go to **Business Settings**
2. Navigate to **Accounts** > **WhatsApp Accounts**
3. Click **Add** and follow the setup process
4. Verify your phone number
5. Complete business verification (may take 1-3 business days)

## Step 3: Get Your Credentials

### WhatsApp Access Token
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app or use existing one
3. Add **WhatsApp** product to your app
4. Go to **WhatsApp** > **Getting Started**
5. Generate a **Temporary Access Token** (24 hours) or set up a **Permanent Access Token**

### Business Account ID
1. In your WhatsApp Business API setup
2. Look for **WhatsApp Business Account ID** in the account details
3. Copy this ID (format: 123456789012345)

### Phone Number ID
1. In WhatsApp Business API setup
2. Go to **Phone Numbers** tab
3. Copy the **Phone Number ID** (not the actual phone number)

## Step 4: Update Environment Variables

Update your `.env.local` file with the following:

```bash
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

## Step 5: Template Creation Process

Once credentials are set up:

1. **Create Template**: Use the template creation form in your app
2. **Meta Review**: Templates are submitted to Meta for approval
3. **Review Time**: Usually 24-48 hours for approval
4. **Status Check**: You can check template status in Meta Business Manager

## Template Categories

- **UTILITY**: Account updates, payment updates, alerts
- **MARKETING**: Promotions, offers, announcements
- **AUTHENTICATION**: OTP, verification codes

## Template Requirements

### Naming
- Only lowercase letters, numbers, and underscores
- No spaces or special characters
- Example: `booking_confirmation`, `payment_reminder`

### Content Limits
- **Header**: 60 characters max
- **Body**: 1024 characters max
- **Footer**: 60 characters max
- **Buttons**: Max 3 buttons per template

### Variables
- Use `{{1}}`, `{{2}}`, etc. for dynamic content
- Provide examples for each variable
- Variables are replaced with actual values when sending

## Common Issues

### 1. "Credentials not configured"
- Check if all environment variables are set
- Restart your development server after updating `.env.local`

### 2. "Invalid access token"
- Regenerate access token in Meta for Developers
- Ensure token has WhatsApp Business permissions

### 3. "Business not verified"
- Complete business verification in Meta Business Manager
- This can take 1-3 business days

### 4. "Template rejected"
- Review Meta's template guidelines
- Avoid promotional content in utility templates
- Ensure variables make sense in context

## Testing

1. Use the template creation form in your app
2. Check Meta Business Manager for template status
3. Test approved templates with the WhatsApp chat interface

## Support Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [Template Guidelines](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/guidelines)

## Security Notes

- Never commit `.env.local` to version control
- Use permanent access tokens for production
- Regularly rotate access tokens
- Monitor API usage in Meta Business Manager
