# TDS Implementation Prompt - Income Tax & GST Compliance

## Overview
Implement comprehensive Tax Deducted at Source (TDS) functionality for both Income Tax Act and GST Act compliance in the existing accounting system. This implementation should seamlessly integrate with the current GST infrastructure, sales/purchase modules, payment/receipt systems, and reporting framework.

## Phase 1: Database Schema Design

### 1.1 Core TDS Tables
Create new Prisma models for TDS management:

TDSMaster Table
- Store TDS rate configurations for different sections (194C, 194H, 194I, 194J, etc.)
- Include fields for section code, description, threshold limit, individual rate, company rate, PAN rate, non-PAN rate
- Add effective date ranges for rate changes
- Include TDS type (Income Tax or GST)
- Add flags for surcharge and cess applicability

TDSTransaction Table
- Link to purchase/expense/payment transactions
- Store TDS section, base amount, TDS rate applied, TDS amount
- Include deductor and deductee details
- Store TAN number, PAN numbers
- Add challan details for TDS deposits
- Include quarter and financial year references

TDSChallan Table
- Store TDS payment details to government
- Include BSR code, challan serial number, deposit date
- Link multiple TDS transactions to single challan
- Store payment mode and bank details

TDSReturn Table
- Store quarterly TDS return information (24Q, 26Q, 27Q, 27EQ)
- Include return acknowledgment number
- Store filing date and revision details

### 1.2 Extend Existing Tables
Modify existing models to support TDS:

Supplier Model
- Add PAN number field
- Add TDS applicable flag
- Add default TDS section
- Add lower/higher TDS certificate details
- Add MSME status for threshold calculations

Customer Model
- Add TAN number for customers who deduct TDS
- Add TDS deductor flag

PurchaseDetail Model
- Add TDS section reference
- Add TDS amount field
- Add TDS challan reference
- Add net payable amount (after TDS)

PaymentDetail Model
- Add TDS deducted amount
- Add TDS certificate number
- Link to TDS transactions

ExpenseDetail Model
- Add similar TDS fields as PurchaseDetail

## Phase 2: Backend API Development

### 2.1 TDS Configuration APIs

TDS Master Management
- Create CRUD APIs for TDS sections at /api/settings/tds-sections
- Include validation for rate limits and threshold amounts
- Support bulk import of TDS rates
- Add API for fetching applicable TDS sections based on transaction type

TDS Calculation Engine
- Create calculation service to compute TDS based on:
  - Transaction amount and type
  - Supplier PAN availability
  - Threshold limits consideration
  - Cumulative payments in financial year
  - Special certificates (lower/nil deduction)
- Handle surcharge and education cess calculations
- Support reverse charge mechanism for GST TDS

### 2.2 Transaction Processing APIs

Purchase with TDS
- Modify /api/purchases POST endpoint to auto-calculate TDS
- Add TDS breakup in response
- Update supplier ledger with TDS entries
- Create automatic TDS liability entries

Payment Processing
- Update /api/payments to handle TDS deductions
- Generate TDS transaction records
- Update outstanding calculations considering TDS

TDS Deposit API
- Create /api/tds/deposit for recording TDS payments
- Generate challan entries
- Update TDS liability accounts

### 2.3 Reporting APIs

TDS Reports
- Create /api/reports/tds/summary for TDS overview
- Add /api/reports/tds/vendor-wise for supplier-wise TDS
- Implement /api/reports/tds/challan-register for payment tracking
- Add /api/reports/tds/certificate for Form 16A generation

Compliance APIs
- Create /api/tds/returns/generate for return preparation
- Add validation APIs for PAN verification
- Implement deadline reminder APIs

## Phase 3: Frontend Implementation

### 3.1 Settings Module

TDS Configuration Page
Create new page at /settings/tds with:
- Tabbed interface for Income Tax TDS and GST TDS sections
- Data table with inline editing for TDS rates
- Import/export functionality for TDS master data
- Effective date management interface
- Search and filter by section codes

Organization Settings Update
Extend /settings/organization to include:
- TAN number field
- TDS deductor type selection
- Default TDS rates configuration
- TDS certificate signatory details

### 3.2 Master Data Enhancement

Supplier Management
Update supplier forms to include:
- PAN number input with validation
- TDS applicable checkbox
- Default TDS section dropdown
- Lower deduction certificate upload
- Certificate validity date tracking
- Threshold limit override option

Customer Management
Add fields for customers acting as TDS deductors:
- TAN number field
- Deductor category selection
- Contact person for TDS matters

### 3.3 Transaction Interfaces

Purchase Entry Enhancement
Modify purchase form to:
- Auto-populate TDS section based on expense type
- Display TDS calculation breakdown
- Show gross amount, TDS amount, and net payable
- Allow TDS section override with reason
- Display cumulative payment for threshold checking

Payment Form Updates
Enhance payment interface with:
- TDS deduction display
- Option to pay with or without TDS
- TDS certificate number input
- Challan details for TDS already deposited
- Net payment calculation display

New TDS Deposit Interface
Create /tds/deposit page with:
- Multi-select for pending TDS transactions
- Challan details form
- Bank selection for payment
- BSR code input
- Bulk deposit functionality
- Email notification to suppliers

### 3.4 Reports and Analytics

TDS Dashboard
Create /reports/tds with:
- Summary cards showing total TDS liability, deposited, pending
- Monthly TDS trend chart
- Section-wise TDS breakdown pie chart
- Upcoming deposit deadlines
- Quarter-wise return filing status

Detailed Reports Section
Implement report pages for:
- Vendor-wise TDS statement with drill-down
- Monthly TDS computation sheet
- Challan reconciliation report
- Form 26AS reconciliation interface
- TDS certificate register
- Section-wise TDS summary

Return Preparation Interface
Create /tds/returns with:
- Quarter selection
- Auto-population from transactions
- Validation checks display
- Correction entry interface
- Return preview before filing
- Download in government format

### 3.5 Voucher and Document Updates

Purchase Voucher Enhancement
Modify purchase voucher to show:
- TDS section and rate applied
- Gross amount and TDS deduction
- Net amount payable
- TDS challan reference if deposited

Payment Voucher Updates
Include TDS details in payment vouchers:
- TDS already deducted amount
- Current payment TDS
- Certificate details

TDS Certificate Generation
Create certificate generation interface:
- Form 16A format for vendors
- Bulk generation capability
- Digital signature integration
- Email delivery system
- Certificate register maintenance

## Phase 4: GST TDS Implementation

### 4.1 GST TDS Specific Features

GST TDS Configuration
- Add 2% TDS rate for GST
- Implement ₹2.5 lakh threshold per contract
- Support for government and local authority deductors
- State-wise TDS tracking

GST TDS Calculation
- Calculate on total invoice value (including GST)
- Handle mixed supplies correctly
- Support composite and mixed suppliers
- Interstate and intrastate distinction

GSTR-7 Preparation
- Create interface for GSTR-7 return
- Auto-populate from transactions
- Generate JSON for upload
- Reconciliation with GSTR-2A

### 4.2 Integration Points

Link with GST Module
- Show TDS in GST reports
- Include in GST reconciliation
- Update input tax credit calculations
- Handle TDS refund claims

## Phase 5: Compliance and Automation

### 5.1 Validation Rules

Real-time Validations
- PAN format validation
- TAN format validation
- Threshold limit checks
- Rate applicability verification
- Certificate validity checks
- Duplicate payment prevention

### 5.2 Automation Features

Auto-calculations
- TDS on bill creation
- Cumulative threshold monitoring
- Interest calculation for late deposit
- Penalty computation

Notifications System
- TDS deposit due date reminders
- Return filing deadlines
- Certificate expiry alerts
- Threshold breach notifications
- Non-PAN transaction warnings

### 5.3 Audit Trail

Compliance Tracking
- Log all TDS modifications
- Track certificate uploads
- Record challan corrections
- Maintain return revision history

## Phase 6: User Interface Considerations

### 6.1 Design Consistency
- Use existing color scheme (purple/indigo gradients for TDS sections)
- Maintain current card-based layout
- Implement similar table structures as GST module
- Use consistent icons from lucide-react

### 6.2 User Experience
- Add tooltips explaining TDS sections
- Provide calculation examples
- Include help documentation links
- Add keyboard shortcuts for frequent operations
- Implement bulk operations where applicable

### 6.3 Mobile Responsiveness
- Ensure all TDS interfaces work on mobile
- Optimize table views for smaller screens
- Enable swipe actions for common operations

## Phase 7: Testing Requirements

### 7.1 Calculation Testing
- Verify TDS calculations for all sections
- Test threshold limit scenarios
- Validate surcharge and cess computation
- Check rounding rules compliance

### 7.2 Integration Testing
- Test with existing purchase flow
- Verify payment processing
- Check report generation
- Validate voucher updates

### 7.3 Compliance Testing
- Verify return format generation
- Test certificate generation
- Validate challan details capture
- Check deadline calculations

## Phase 8: Migration Strategy

### 8.1 Data Migration
- Create migration scripts for existing suppliers
- Update historical transactions with TDS sections
- Calculate opening TDS balances
- Generate initial threshold positions

### 8.2 Rollout Plan
- Phase 1: TDS configuration and settings
- Phase 2: Supplier updates and master data
- Phase 3: Transaction processing
- Phase 4: Reporting and compliance
- Phase 5: Full automation features

## Implementation Notes

### Technical Considerations
- Utilize existing date utility functions for financial year calculations
- Leverage current authentication and authorization system
- Extend existing transaction status workflows
- Reuse GST calculation patterns for TDS
- Implement similar caching strategies as GST module

### Performance Optimization
- Index TDS transaction tables properly
- Implement pagination for large reports
- Cache TDS rates and sections
- Optimize cumulative calculation queries
- Use batch processing for bulk operations

### Security Measures
- Encrypt PAN and TAN numbers
- Implement role-based access for TDS operations
- Add audit logs for all TDS transactions
- Secure certificate storage
- Validate all inputs against injection attacks

### Documentation Requirements
- Create user manual for TDS operations
- Document all TDS sections and rates
- Provide compliance calendar
- Include troubleshooting guide
- Add API documentation for integrations

This implementation should provide comprehensive TDS functionality while maintaining consistency with the existing system architecture and user experience patterns.
