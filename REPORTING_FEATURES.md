# Enhanced Reporting System

## Overview
This document outlines the comprehensive reporting system implemented for the timesheet management application, including fixed PDF exports, pay period reports, and custom report builder functionality.

## Features Implemented

### 1. Fixed PDF Export Issues ✅
- **Problem**: PDF exports were creating broken/corrupted files
- **Solution**: Properly implemented jsPDF with autoTable plugin
- **Implementation**: 
  - Added proper jsPDF imports and type declarations
  - Fixed PDF generation with proper headers and table formatting
  - Added landscape orientation and proper styling for timesheet data

### 2. Pay Period Reports ✅
- **Feature**: Generate reports for specific pay periods with user summaries
- **Functionality**:
  - Select custom date ranges (start date to end date)
  - Export as CSV or PDF
  - Shows all users who had timesheets in that period
  - Includes: Employee name, email, manager info, total hours, PLAWA hours, pay rate, estimated pay
- **API Endpoint**: `/api/hr/export?type=payperiod&periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD&format=csv|pdf`

### 3. Custom Report Builder ✅
- **Feature**: HR can create, edit, and delete custom reports
- **Components**:
  - Interactive report builder with step-by-step wizard
  - Column selection by category (Employee, Manager, Hours, Pay, etc.)
  - Filter configuration (date range, status, users, roles)
  - Report type selection (Timesheet Summary vs User Summary)

### 4. Custom Reports Management ✅
- **CRUD Operations**:
  - Create new custom reports with specific configurations
  - View all saved custom reports
  - Execute reports with CSV/PDF export
  - Delete reports with confirmation dialog
  - Edit existing reports (gear icon)

## Database Schema Changes

### CustomReport Model
```prisma
model CustomReport {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdBy   String
  config      String   // JSON configuration
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator User @relation(fields: [createdBy], references: [id])
}
```

## API Endpoints

### Custom Reports
- `GET /api/hr/custom-reports` - List all active custom reports
- `POST /api/hr/custom-reports` - Create new custom report
- `PUT /api/hr/custom-reports` - Update existing custom report
- `DELETE /api/hr/custom-reports?id={reportId}` - Soft delete custom report
- `POST /api/hr/custom-reports/{id}/execute` - Execute custom report

### Enhanced Export
- `GET /api/hr/export?format=csv|pdf` - Export all timesheets
- `GET /api/hr/export?type=payperiod&periodStart=DATE&periodEnd=DATE&format=csv|pdf` - Pay period report

## UI Components

### 1. Enhanced HR Dashboard
- New "Reports" tab with three main sections:
  - Export All Timesheets (CSV/PDF)
  - Pay Period Report (with date picker modal)
  - Custom Report Builder
- List of saved custom reports with action buttons

### 2. Report Builder Component (`ReportBuilder.tsx`)
- 4-step wizard interface:
  1. Basic Info (name, description, report type)
  2. Column Selection (organized by categories)
  3. Filter Configuration (optional filters)
  4. Review & Save
- Progress indicator and navigation
- Validation and error handling

### 3. Pay Period Modal
- Date range picker
- Export options (CSV/PDF)
- Validation for required dates

## Report Types

### Timesheet Summary Reports
**Columns Available**:
- Employee: Name, Email
- Manager: Name, Email  
- Period: Start Date, End Date
- Timesheet: Status
- Hours: Total, Regular, PLAWA
- Pay: Rate, Estimated Pay
- Signatures: Staff, Manager, HR

### User Summary Reports
**Columns Available**:
- Employee: Name, Email, Role
- Manager: Name, Email
- Pay: Rate, Total Pay
- Hours: Total, Regular, PLAWA
- Summary: Timesheet Count, Approved Count, Approval Rate

## Filter Options
- **Date Range**: Filter by specific time periods
- **Status**: Filter by timesheet status (Draft, Submitted, Approved, etc.)
- **Specific Users**: Filter by selected employees
- **Roles**: Filter by employee roles (Staff, Manager, HR)

## Usage Instructions

### Creating a Custom Report
1. Navigate to HR Dashboard → Reports tab
2. Click "Create Report" in the Custom Reports section
3. Follow the 4-step wizard:
   - Enter report name and description
   - Select report type (Timesheet vs User Summary)
   - Choose columns to include
   - Configure available filters
   - Review and save

### Generating Pay Period Reports
1. Navigate to HR Dashboard → Reports tab
2. Click "Generate Report" in the Pay Period Report section
3. Select start and end dates
4. Choose export format (CSV or PDF)
5. Report downloads automatically

### Executing Custom Reports
1. Find the saved report in the Custom Reports list
2. Click the download icon (CSV) or document icon (PDF)
3. Report executes with current data and downloads

### Managing Custom Reports
- **Edit**: Click gear icon to modify report configuration
- **Delete**: Click trash icon and confirm deletion
- **View Details**: See creator, creation date, and description

## Technical Implementation

### PDF Generation
- Uses jsPDF with autoTable plugin
- Proper type declarations for TypeScript
- Landscape orientation for better table display
- Professional styling with headers and formatting

### Data Processing
- Efficient database queries with Prisma includes
- Proper hour calculations from time entries
- PLAWA hours tracking and regular hours calculation
- Pay calculations based on user pay rates

### Security
- JWT token authentication required
- HR/Admin role verification
- Input validation and sanitization
- Soft delete for custom reports (isActive flag)

## Testing
A test script (`test-custom-reports.js`) is included to verify:
- Authentication flow
- Custom report creation
- Report listing
- Export functionality
- Pay period reports

## Future Enhancements
- Report scheduling and email delivery
- More advanced filtering options
- Chart and graph generation
- Report templates and sharing
- Audit trail for report access
- Performance optimization for large datasets

## Files Modified/Created
- `src/app/api/hr/custom-reports/route.ts` - Custom reports CRUD API
- `src/app/api/hr/custom-reports/[id]/execute/route.ts` - Report execution API
- `src/app/api/hr/export/route.ts` - Enhanced export with PDF fixes and pay period reports
- `src/app/hr/HRDashboardView.tsx` - Enhanced dashboard with reporting UI
- `src/components/ReportBuilder.tsx` - Custom report builder component
- `prisma/schema.prisma` - Added CustomReport model
- `test-custom-reports.js` - Testing script

This comprehensive reporting system provides HR with powerful tools to analyze timesheet data, generate custom reports, and export information in multiple formats while maintaining security and user-friendly interfaces. 