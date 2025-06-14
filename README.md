# Timesheet Management Service (TMS)

A comprehensive full-stack timesheet management system built with Next.js 14, featuring digital signatures, real-time messaging, automated workflows, and role-based access control.

## 🚀 Features

### ✅ **Completed Features**

#### **Core Functionality**
- **Automated Pay-Period Creation**: Bi-monthly timesheet generation (1-15 and 16-EOM)
- **Digital Signatures**: Capture and store signatures at each approval step
- **Role-Based Access Control**: Staff, Manager, HR/Admin roles with specific permissions
- **Real-Time Updates**: Live notifications and messaging using Socket.IO
- **Responsive Design**: Mobile-first UI with amazing UX

#### **Approval Workflow**
- **Staff**: Create, edit, and submit timesheets with digital signatures
- **Manager**: Review and approve/deny direct reports' timesheets
- **HR/Admin**: Final approval and comprehensive system management

#### **Advanced Features**
- **Real-Time Messaging**: Contextual timesheet discussions and private chats
- **Email Notifications**: Configurable email alerts (disabled by default)
- **Automated Backups**: Scheduled database backups with retention policies
- **Export Functionality**: CSV and PDF report generation
- **Toast Notifications**: In-app feedback for all user actions

#### **UI/UX Excellence**
- **Modern Design**: Clean, professional interface with smooth animations
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Interactive Elements**: Hover effects, transitions, and micro-interactions

## 🛠 Technology Stack

### **Frontend**
- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS v4** for styling
- **Lucide React** for icons
- **React Hook Form** for form management
- **React Signature Canvas** for digital signatures
- **React Toastify** for notifications
- **Socket.IO Client** for real-time features

### **Backend**
- **Next.js API Routes** with TypeScript
- **NextAuth.js** for authentication
- **Prisma ORM** with SQLite database
- **Socket.IO Server** for real-time communication
- **Nodemailer** for email notifications
- **Node-cron** for scheduled tasks

### **Database**
- **SQLite** with Prisma ORM
- **Automated migrations**
- **Seeded test data**

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── timesheet/         # Timesheet CRUD operations
│   │   ├── manager/           # Manager-specific endpoints
│   │   └── hr/                # HR management endpoints
│   ├── staff/                 # Staff dashboard and timesheet views
│   ├── manager/               # Manager approval interface
│   ├── hr/                    # HR administration panel
│   └── auth/                  # Authentication pages
├── components/
│   ├── Layout.tsx             # Main application layout
│   ├── TimesheetGrid.tsx      # Interactive timesheet calendar
│   ├── SignatureModal.tsx     # Digital signature capture
│   ├── ChatWindow.tsx         # Real-time messaging component
│   └── HRDashboardView.tsx    # HR management interface
├── lib/
│   ├── auth.ts                # NextAuth configuration
│   ├── db.ts                  # Prisma client setup
│   ├── timesheet.ts           # Timesheet business logic
│   ├── utils.ts               # Utility functions
│   ├── mailer.ts              # Email notification service
│   └── backup.ts              # Backup and restore functionality
├── pages/api/
│   └── socket.ts              # Socket.IO server setup
└── prisma/
    ├── schema.prisma          # Database schema
    └── seed.ts                # Database seeding
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- npm or yarn

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TimeManagement
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your configuration
   DATABASE_URL="file:./prisma/dev.db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Use the seeded test accounts (see below)

### **Test Accounts**

| Role | Email | Password |
|------|-------|----------|
| HR/Admin | hr@company.com | password123 |
| Manager | manager@company.com | password123 |
| Staff | alice@company.com | password123 |
| Staff | bob@company.com | password123 |
| Staff | carol@company.com | password123 |

**Note:** Bob has a denied timesheet with manager feedback for testing the denial workflow.

## 📋 User Workflows

### **Staff Workflow**
1. **Login** → Redirected to staff dashboard
2. **View Current Timesheet** → Auto-generated for current pay period
3. **Enter Time** → Three in/out pairs + PLAWA hours per day
4. **Real-Time Calculations** → Daily and period totals update live
5. **Submit** → Digital signature required
6. **Chat** → Discuss timesheet with manager/HR

### **Manager Workflow**
1. **Login** → View pending approvals from direct reports
2. **Review Timesheets** → See detailed time entries and totals
3. **Approve/Deny** → Digital signature for approval, note for denial
4. **Real-Time Updates** → Instant notifications and status changes
5. **Chat** → Communicate with staff about timesheets

### **HR/Admin Workflow**
1. **Login** → Comprehensive HR dashboard
2. **Final Approvals** → Review manager-approved timesheets
3. **User Management** → Create, edit, delete user accounts
4. **Reports** → Export timesheet data as CSV/PDF
5. **System Settings** → Configure notifications, backups
6. **Backup Management** → Manual and scheduled database backups

## 🔧 Configuration

### **Email Notifications**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_NOTIFICATIONS_DEFAULT="false"
```

### **Backup Settings**
```env
BACKUP_CRON="0 2 * * *"  # Daily at 2 AM
BACKUP_PATH="./backups"
```

### **Real-Time Features**
- Socket.IO server runs on the same port as the Next.js app
- Automatic room management for timesheet discussions
- Real-time notifications for workflow events

## 🎨 UI/UX Features

### **Design System**
- **Primary Color**: Blue (#3b82f6)
- **Typography**: Inter font family
- **Spacing**: Consistent 4px grid system
- **Animations**: Smooth transitions and micro-interactions

### **Responsive Design**
- **Mobile-First**: Optimized for all screen sizes
- **Collapsible Sidebar**: Clean navigation on mobile
- **Touch-Friendly**: Large tap targets and gestures

### **Accessibility**
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG compliant color schemes

## 🔒 Security Features

- **Authentication**: Secure session management with NextAuth.js
- **Authorization**: Role-based access control
- **Data Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Prisma ORM prevents SQL injection
- **CSRF Protection**: Built-in Next.js CSRF protection

## 📊 Performance

- **Server-Side Rendering**: Fast initial page loads
- **Optimistic Updates**: Immediate UI feedback
- **Efficient Queries**: Optimized database queries with Prisma
- **Caching**: Strategic caching for better performance
- **Bundle Optimization**: Tree-shaking and code splitting

## 🧪 Testing

The application includes comprehensive testing capabilities:

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Full workflow testing
- **Manual Testing**: All features have been manually tested

## 🚀 Deployment

### **Production Setup**
1. **Environment Variables**: Set production values
2. **Database**: Configure production database
3. **Email Service**: Set up SMTP service
4. **Backup Storage**: Configure backup location
5. **SSL Certificate**: Enable HTTPS
6. **Process Management**: Use PM2 or similar

### **Recommended Deployment**
- **Platform**: Vercel, Netlify, or VPS
- **Database**: PostgreSQL for production
- **Email**: SendGrid, Mailgun, or similar
- **Monitoring**: Sentry for error tracking

## 📈 Future Enhancements

While the current implementation is feature-complete, potential enhancements include:

- **Advanced Reporting**: More detailed analytics and charts
- **Mobile App**: React Native companion app
- **API Integration**: Third-party payroll system integration
- **Advanced Permissions**: Granular permission system
- **Audit Logging**: Comprehensive audit trail
- **Multi-Tenant**: Support for multiple organizations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the test accounts and workflows
- Examine the code comments and structure
- Test the live application features

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies.** 