# Sri Guru Nanak Public School — ERP User Guide

Welcome to the SGNPS School ERP System! This guide will help you understand how to use every feature of the system based on your role.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Dashboard Overview](#dashboard-overview)
4. [Subject Management](#subject-management)
5. [Fee Management](#fee-management)
6. [Student Management](#student-management)
7. [Teacher & Subject Assignment](#teacher--subject-assignment)
8. [Exams & Marks](#exams--marks)
9. [Attendance](#attendance)
10. [Timetable](#timetable)
11. [Notices](#notices)
12. [Report Card (Students)](#report-card)
13. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Getting Started

The School ERP is a web-based application accessible from any modern browser (Chrome, Firefox, Edge, Safari). No installation is required.

### Supported Roles

| Role | Access Level |
|------|-------------|
| **Admin / Super Admin** | Full system access — manage students, teachers, fees, exams, subjects, and all settings |
| **Teacher** | View students, manage subjects, enter marks, take attendance, manage assignments |
| **Student** | View own fees, attendance, report card, timetable, assignments, and notices |
| **Parent** | View child's report card, attendance, fees, and notices |

---

## Logging In

1. Open the ERP application URL in your browser
2. Select your role using the tabs at the top (Admin / Teacher / Student)
3. Enter your email address and password
4. Click **Sign In**

> **Tip**: Click the 👁 eye icon to show/hide your password while typing.

### Default Credentials (First Login)
- Admin: `admin@sgnps.com` / `admin123`
- Teachers & Students: Use credentials provided by your school administrator

---

## Dashboard Overview

After logging in, you'll see your personalized dashboard with:

### Admin Dashboard
- **Stats Cards**: Total students, teachers, classes, attendance counts, fee collection summary
- **Fee Collection Chart**: Visual pie chart showing paid vs pending vs overdue fees
- **Quick Actions**: One-click access to frequently used modules

### Teacher Dashboard
- **My Students**: Count of students in your assigned classes
- **Quick Actions**: Enter marks, take attendance, manage assignments, view timetable

### Student Dashboard
- **Fee Summary**: Your total paid, pending, and overdue fees at a glance
- **Quick Links**: Access fees, report card, attendance, assignments, timetable, notices

---

## Subject Management

*Available to: Admin, Teachers*

### Viewing Subjects
Navigate to **Subjects** from the sidebar. You'll see:
- **Stats**: Total subjects, active, inactive, and graded counts
- **Search**: Filter by subject name or code
- **Status Filter**: Show All, Active Only, Inactive Only, or Graded Only

### Adding a Subject (Admin/Teacher)
1. Click **Add Subject**
2. Fill in:
   - **Subject Name** (required): e.g., "Mathematics"
   - **Subject Code**: e.g., "MAT" (auto-capitalized, max 10 chars)
   - **Description**: Optional description
   - **Subject Type**: Toggle between Scholastic (marks-based) and Graded (grade-based)
   - **Status**: Active or Inactive
3. Click **Create**

### Editing a Subject
1. Click the ✏️ pencil icon on any subject row
2. Modify the details
3. Click **Update**

### Toggling Active/Inactive
Click the toggle icon (⏼) to quickly activate or deactivate a subject. Inactive subjects won't appear in assignment dropdowns.

### Deleting a Subject (Admin only)
Click the 🗑 trash icon. A confirmation dialog will appear. Click **Delete Subject** to confirm.

---

## Fee Management

*Available to: Admin (full access), Students (view own fees)*

### Admin: Overview Tab
The default tab shows:
- **Summary Stats**: Total collected, pending, overdue, and collection rate percentage
- **Payment Status Chart**: Pie chart of paid/pending/overdue distribution
- **Collection by Fee Type**: Bar chart showing collected vs pending by fee type

### Admin: Student Lookup Tab
1. Click the **Student Lookup** tab
2. Enter a student's **admission number** or **name** in the search bar
3. Press Enter or click **Search**
4. View the student's profile card with:
   - Name, class, admission number, father's name
   - Fee summary (paid, pending, overdue totals)
   - Complete fee history table

### Admin: All Records Tab
View all fee records with powerful filtering:
- **Search**: By student name, admission number, or receipt number
- **Status Filter**: Paid, Pending, Overdue
- **Fee Type Filter**: Tuition, Transport, Exam, etc.
- **Class Filter**: Filter by student class
- **Pagination**: Navigate through large datasets (10/20/50 records per page)

### Adding a Fee Record
1. Click **Add Fee**
2. Search for a student by name or admission number
3. Select the student from the dropdown
4. Choose Fee Type, enter Amount, set Due Date
5. Optionally select Month
6. Click **Create**

### Recording a Payment
1. Find the unpaid fee record
2. Click the ✓ checkmark icon
3. Select Payment Method (Cash, Bank Transfer, Online, Cheque)
4. Click **Confirm Payment**
5. A receipt is generated — click **Print Receipt** to print

### Student View
Students see their own fee summary and history with clear status indicators:
- ✅ **Paid** (green)
- ⏳ **Pending** (amber)
- 🔴 **Overdue** (red, with days overdue count)

---

## Student Management

*Available to: Admin, Teachers*

### Adding a Student
1. Navigate to **Students**
2. Click **Add Student**
3. Fill in required fields (marked with *):
   - First Name, Email
4. Fill in optional fields: Last Name, Class, Roll No, Admission No, Date of Birth, Gender, Parent details
5. Click **Create**

### Editing a Student
Click the ✏️ pencil icon on any student row to edit their details.

### Deleting a Student
Click the 🗑 trash icon. A confirmation dialog will warn that all related records (fees, marks, attendance) will also be removed.

---

## Teacher & Subject Assignment

*Available to: Admin, Teachers*

### Assigning a Teacher to a Subject
1. Navigate to **Subject Assignment**
2. Click **Assign Subject**
3. Select Class, Subject (only active subjects shown), and Teacher
4. Click **Assign**

### Removing an Assignment
Click the 🗑 trash icon on any assignment row. A confirmation dialog will appear.

---

## Fee Structures

*Available to: Admin*

### Creating a Fee Structure
Define standard fees per class/academic year:
1. Navigate to **Fee Structures**
2. Click **Add Structure**
3. Select Academic Year, Class, Fee Type, Amount, Due Date, Late Fee Per Day
4. Click **Create**

### Applying to All Students
Click the 👥 users icon to auto-create fee records for every student in that class.

### Copying a Structure
Click the 📋 copy icon to duplicate a structure for a different class.

---

## Fee Reminders

*Available to: Admin*

View students with unpaid/overdue fees:
- Search by name or admission number
- See total outstanding amount and overdue counts
- Send individual SMS reminders
- Send bulk reminders to all defaulters

> **Note**: SMS functionality requires the Supabase Edge Function `send-fee-reminder` to be configured.

---

## Exams & Marks

### Exams
- Admin can create, schedule, and publish exams
- Teachers and students can view exam schedules

### Marks Entry (Admin/Teacher)
1. Navigate to **Marks Entry**
2. Select Exam and Class
3. Enter marks for each student and subject
4. Save marks

---

## Attendance

- Admin/Teachers can mark daily attendance (Present/Absent/Late/Half Day)
- Students can view their own attendance history

---

## Timetable

- Admin can create/edit the weekly timetable per class
- Teachers and students can view their timetable

---

## Notices

- Admin can create and publish notices with categories and target audiences
- All users can view published notices

---

## Report Card

*Available to: Students, Parents*

View your complete report card with subject-wise marks across all exam terms.

---

## FAQ & Troubleshooting

### Q: I can't log in
- Verify you're selecting the correct role (Admin/Teacher/Student)
- Check that your email and password are correct
- Contact your administrator to verify your account exists

### Q: I don't see the Subjects/Fee pages
- These pages are role-restricted. Only Admins and Teachers can access Subject management. Only Admins have full fee management access.

### Q: The fee status shows "overdue" but the student paid
- An admin needs to click the ✓ checkmark on the fee record to mark it as paid

### Q: How do I change my password?
- Contact your school administrator to reset your password

### Q: The SMS reminders aren't working
- The Supabase Edge Function `send-fee-reminder` needs to be deployed and configured with an SMS provider (e.g., Twilio)

### Q: Can I export data?
- Currently, data can be exported via the Supabase dashboard. A built-in export feature is planned for a future release.

---

*© Sri Guru Nanak Public School — ERP System v2.0*
