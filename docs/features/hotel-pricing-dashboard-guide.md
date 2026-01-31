# Hotel Pricing Dashboard - User Guide

## Overview

The Hotel Pricing Dashboard provides a user-friendly interface for managing hotel pricing with advanced features like location-based filtering, inline editing, and automatic period splitting.

## Key Features

### 1. Location-Based Filtering

The dashboard follows a hierarchical selection pattern:

1. **Location Selector**: First, select a location from the dropdown
2. **Hotel Selector**: Then, select a hotel from the filtered list of hotels in that location
3. **Pricing Grid**: View and manage pricing for the selected hotel

This approach ensures you're always working with the right context and prevents mistakes.

### 2. Google Sheets-Like Interface

The pricing grid is designed to look and feel like a spreadsheet:

- **One row per pricing period**: Each row shows a complete pricing configuration
- **Inline editing**: Click "Edit" to modify a row directly in the table
- **Quick actions**: Edit, Duplicate, or Delete with one click
- **Clear visual feedback**: Editing rows are highlighted in blue

### 3. Pricing Attributes

Each pricing period includes:

- **Room Type**: Type of room (e.g., Deluxe, Suite, Standard)
- **Occupancy Type**: Number of guests (e.g., Single, Double, Triple)
- **Meal Plan**: Optional meal inclusion (e.g., AP, CP, MAP, EP)
- **Start Date**: Beginning of the pricing period
- **End Date**: End of the pricing period
- **Price**: Price per night in INR (₹)

### 4. Automatic Period Splitting

The most powerful feature of this dashboard is automatic period splitting. This handles the complex scenario where you want to add pricing that overlaps with existing pricing.

#### How It Works

**Example Scenario:**

Let's say you have:
- **Existing Pricing**: April 1 to December 31 @ ₹5,000

You want to add:
- **New Pricing**: July 1 to September 30 @ ₹7,000

**What Happens:**

1. The system detects the overlap
2. Shows you a detailed preview dialog with:
   - The existing period that will be affected
   - How it will be split
   - The resulting periods after the change
3. You review and confirm
4. The system automatically creates:
   - April 1 to June 30 @ ₹5,000 (preserved old pricing)
   - July 1 to September 30 @ ₹7,000 (your new pricing)
   - October 1 to December 31 @ ₹5,000 (preserved old pricing)

**Important Notes:**

- Only periods with **matching** Room Type, Occupancy, and Meal Plan are split
- Different configurations can coexist without conflicts
- Original pricing is always preserved for non-overlapping dates
- You can undo changes by editing or deleting the periods

### 5. Confirmation Dialog

When period splitting will occur, you'll see a detailed confirmation dialog:

**🔶 Affected Periods Section:**
- Shows all existing periods that will be modified
- Displays their current date ranges and prices
- Color-coded in amber to indicate they'll change

**✅ Resulting Periods Section:**
- Shows exactly what periods will exist after the change
- "NEW" tags indicate your new pricing
- "PRESERVED" tags show segments of old pricing that remain
- Color-coded in green for clarity

**ℹ️ Information Section:**
- Explains what will happen
- Lists the steps the system will take
- Reminds you that changes can be undone

## How to Use

### Adding a New Pricing Period

1. Select a **Location** from the dropdown
2. Select a **Hotel** from the filtered list
3. Click **"Add Pricing Period"**
4. Fill in the inline form:
   - Select Room Type
   - Select Occupancy Type
   - Select Meal Plan (optional)
   - Pick Start Date
   - Pick End Date
   - Enter Price
5. Click the **Save** button (green checkmark)
6. If there's overlap, review the confirmation dialog and click **"Confirm & Apply Pricing"**

### Editing a Pricing Period

1. Navigate to the pricing you want to edit
2. Click the **Edit** button (pencil icon)
3. Modify the values in the inline form
4. Click **Save** to apply changes
5. Click **Cancel** (X icon) to discard changes

### Duplicating a Pricing Period

The duplicate feature helps you quickly create similar pricing:

1. Find the pricing period you want to copy
2. Click the **Duplicate** button (copy icon)
3. The system pre-fills a new row with:
   - Same Room Type, Occupancy, and Meal Plan
   - Start Date set to the day after the original End Date
   - End Date set to 30 days after the new Start Date
   - Same Price
4. Adjust the dates and price as needed
5. Click **Save**

### Deleting a Pricing Period

1. Find the pricing period you want to remove
2. Click the **Delete** button (trash icon in red)
3. Confirm the deletion in the popup
4. The period is removed immediately

## Best Practices

### 1. Plan Your Pricing Periods

Before entering data:
- Identify your seasonal periods (peak, off-peak, etc.)
- Determine your pricing tiers
- Consider special events or holidays

### 2. Use Logical Date Ranges

- Avoid gaps between periods if you want continuous coverage
- Use the duplicate feature to maintain consistency
- Split by season or month for easier management

### 3. Review Before Confirming

When you see the split confirmation dialog:
- Carefully review the "Affected Periods" section
- Verify the "Resulting Periods" match your expectations
- Check that prices are correct

### 4. Test with One Hotel First

If you're setting up pricing for multiple hotels:
- Complete one hotel entirely
- Review and test
- Use the pattern for other hotels

### 5. Document Special Pricing

For special event pricing or promotions:
- Use clear date ranges
- Consider adding notes in your records
- Plan to review after the event

## Common Scenarios

### Scenario 1: Setting Up Seasonal Pricing

**Goal**: Different prices for summer and winter

1. Add pricing for summer months (April-September)
2. Add pricing for winter months (October-March)
3. Each season can have different prices per room type

### Scenario 2: Updating Peak Season Rates

**Goal**: Change December rates from ₹8,000 to ₹10,000

1. Edit the existing December period
2. Update the price
3. Save - no split needed since you're updating the same period

### Scenario 3: Adding Festival Pricing

**Goal**: Add special pricing for Diwali week in October

1. Find your existing October pricing
2. Add new pricing for Diwali dates (e.g., Oct 20-27)
3. Review the split confirmation:
   - Oct 1-19 @ old price (preserved)
   - Oct 20-27 @ festival price (new)
   - Oct 28-31 @ old price (preserved)
4. Confirm and apply

### Scenario 4: Multiple Room Types

**Goal**: Set different prices for Deluxe and Suite rooms

1. Add pricing for Deluxe rooms with your date range
2. Add pricing for Suite rooms with the same date range
3. Both coexist without conflict because they have different Room Types

## Troubleshooting

### "Please select a location first"

**Problem**: Trying to select a hotel without choosing a location
**Solution**: Use the Location dropdown first, then select a hotel

### "End date must be on or after start date"

**Problem**: End date is before start date
**Solution**: Adjust your dates so End Date ≥ Start Date

### "Something went wrong"

**Problem**: General error during save
**Solution**: 
- Check your internet connection
- Verify all required fields are filled
- Try refreshing the page
- Contact support if the issue persists

### Dates Appearing Shifted

**Problem**: Dates show as one day before/after what you selected
**Solution**: This is a timezone handling issue that has been fixed in the latest version. Ensure you're on the latest deployment.

## Technical Details

### Date Handling

All dates are stored in UTC in the database but displayed in your local timezone. This ensures:
- Consistency across different users in different timezones
- Accurate date range calculations
- No daylight saving time issues

### Period Matching

For period splitting to occur, periods must match on:
- Hotel ID
- Room Type ID
- Occupancy Type ID
- Meal Plan ID (including null/none)

Periods with different attributes can overlap without conflict.

### Atomicity

Period splitting uses database transactions to ensure:
- All changes succeed or all fail (no partial updates)
- Data consistency
- Safe concurrent operations

## Support

If you encounter issues or need help:

1. Check this documentation first
2. Review the test examples in the codebase
3. Contact your system administrator
4. Report bugs with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
