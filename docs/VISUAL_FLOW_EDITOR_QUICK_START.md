# Visual Flow Editor - Quick Start Guide

## Overview

The Visual Flow Editor provides a drag-and-drop interface for building WhatsApp Flows without writing JSON code.

## Accessing the Visual Editor

1. Navigate to **WhatsApp → Flows** in the dashboard
2. Either:
   - Select an existing flow and click "Open designer"
   - Create a new flow using "Template wizard"
3. Click the **"Visual editor"** tab (third tab with Workflow icon)

## Interface Layout

### Left Sidebar: Component Palette
Browse and add components organized by category:

**Inputs** (Form fields):
- Text Input
- Text Area
- Dropdown
- Date Picker
- Checkbox Group
- Radio Buttons
- Opt In

**Display** (Content):
- Heading
- Subheading
- Body Text
- Caption
- Image
- Link

**Actions** (Interactive):
- Footer (buttons with navigation/actions)
- Form (container for grouping components)

### Center Canvas: Flow Builder
- **Screen Tabs**: Switch between screens, add/delete screens
- **Component List**: See all components on current screen
- **Reorder Buttons**: Move components up/down (↑↓)
- **Delete Buttons**: Remove components (🗑️)

### Right Sidebar: Properties Panel
Edit selected component or screen:
- **Component properties**: name, label, required, etc.
- **Type-specific settings**: input types, data sources, actions
- **Screen settings**: ID, title, terminal/success flags

## Building a Flow

### Step 1: Add a Screen
1. Click "+ Add Screen" button
2. Set screen ID (e.g., "WELCOME_SCREEN")
3. Set screen title (shown to user)
4. Toggle terminal/success if this is an ending screen

### Step 2: Add Components
1. Click component type in palette (left sidebar)
2. Component appears in canvas
3. Click component to select and edit properties

### Step 3: Configure Properties
1. Select component in canvas
2. Edit in properties panel (right sidebar):
   - **Name**: Unique identifier (used in data)
   - **Label**: Text shown to user
   - **Required**: Toggle if input is mandatory
   - **Type-specific**: e.g., input-type for Text Input

### Step 4: Reorder Components
- Use ↑↓ buttons next to each component
- Components render in order from top to bottom

### Step 5: Save Flow
1. Click "Save Flow" button (top-right)
2. Flow is pushed to Meta WhatsApp API
3. Success notification appears

## Component Examples

### Text Input
```
Name: email_address
Label: Your Email
Input Type: email
Required: Yes
```

### Dropdown
```
Name: country
Label: Select Country
Required: Yes
Data Source:
  - id: us, title: United States
  - id: uk, title: United Kingdom
  - id: in, title: India
```

### Footer (Navigation Button)
```
Label: Next
Action: navigate
Screen: CONTACT_SCREEN
```

### Footer (Submit Button)
```
Label: Submit
Action: data_exchange
```

## Multi-Screen Flows

### Creating Multiple Screens
1. Click "+ Add Screen" for each screen
2. Use screen tabs to switch between them
3. Configure Footer components to navigate between screens

### Navigation Example
**Screen 1: WELCOME_SCREEN**
- Heading: "Welcome"
- Body Text: "Tell us about yourself"
- Footer: label="Next", action=navigate, screen=CONTACT_SCREEN

**Screen 2: CONTACT_SCREEN**
- Text Input: name="email"
- Text Input: name="phone"
- Footer: label="Submit", action=data_exchange

## Best Practices

### Naming Conventions
- **Screen IDs**: UPPERCASE_WITH_UNDERSCORES (e.g., "CONTACT_INFO_SCREEN")
- **Component names**: lowercase_with_underscores (e.g., "email_address")
- Use descriptive names for clarity

### Component Order
- Place headings/instructions before inputs
- Group related inputs together
- Put Footer (buttons) at the bottom

### Required Fields
- Mark critical inputs as required
- Add caption text to explain optional fields
- Validate email/phone input types

### Screen Flow
- Start with welcome/intro screen
- Collect data in logical steps
- End with success screen (mark as terminal/success)

## Error Handling

### Invalid JSON
If you switch to visual editor and see an error:
1. Click "Go to JSON editor" button
2. Fix JSON syntax errors
3. Return to visual editor

### Validation
- Component names must be unique within a screen
- Screen IDs must be unique within the flow
- Navigation targets must reference existing screens

## Switching Between Editors

### Visual → JSON
- Click "Switch to JSON editor" button
- See generated JSON code
- Make advanced edits if needed

### JSON → Visual
- Click "Visual editor" tab
- JSON is automatically parsed
- If invalid, error message appears

## Keyboard Shortcuts

- **Tab**: Navigate between properties
- **Enter**: Confirm input changes
- **Escape**: Close dialogs

## Tips & Tricks

1. **Preview Often**: Use "Preview" tab to see how flow looks in WhatsApp
2. **Version Snapshots**: Save versions before major changes (use "Versions" tab)
3. **Copy Flows**: Clone successful flows and modify them
4. **Test Data**: Use test mode to verify form submissions
5. **Component Reuse**: Add Form containers to group reusable sections

## Troubleshooting

### Changes Not Saving
- Check internet connection
- Verify WhatsApp API credentials are configured
- Look for error toast notifications
- Check browser console for API errors

### Component Not Appearing
- Ensure component name is unique
- Check if component is visible/enabled in properties
- Verify screen is selected in canvas

### Navigation Not Working
- Confirm target screen ID matches exactly
- Check Footer action is set to "navigate"
- Verify screen parameter is filled

## Advanced Features

### Form Containers
1. Add a Form component from palette
2. Other components can be nested inside (future enhancement)
3. Form handles validation and submission together

### Data Sources for Dropdowns
1. Select Dropdown or Radio Buttons component
2. Click "Edit options" in properties panel
3. Add options with ID and title
4. IDs are used in submitted data, titles shown to user

### Image Components
1. Add Image component
2. Enter image URL in properties
3. Image must be hosted and publicly accessible
4. Use HTTPS URLs for security

## Support

For issues or feature requests:
1. Check existing documentation in `/docs` folder
2. Review `VISUAL_FLOW_EDITOR_COMPLETE.md` for technical details
3. Test in JSON editor if visual editor has issues
4. Check WhatsApp Flow API documentation for component specifications

## Next Steps

- Experiment with templates in Template Wizard
- Build simple flows before complex multi-screen ones
- Use Preview feature to test user experience
- Share flows with team for feedback
- Monitor analytics to improve flow completion rates
