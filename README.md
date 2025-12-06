# Priorify

A smarter, cleaner way for students to organize their tasks.

---

## Overview

Priorify is a lightweight productivity web app designed to help students plan their day more clearly.  
The app combines a draggable task list with a calendar, allowing users to visualize their schedule and manage tasks effortlessly.

---

## Core Features

### Welcome Page

- Introduces the app with a clean, fresh design  
- Contains a primary call-to-action button: **“Let’s get started”**  
- Button navigates to the **Login** page

### Login / Sign-up (Firebase Auth)

- Email + Password authentication  
- Login and Sign-up forms on the same page with a toggle  
- Firebase handles user authentication and session persistence  
- Successful login or sign-up redirects to the **Dashboard**

### Dashboard

A two-panel layout:

#### Left: Task List

- Shows all tasks or today’s tasks  
- Displays:
  - Task title  
  - Due date  
  - Priority (High / Medium / Low)  
  - Context tag (e.g., `@home`, `@commute`, `@laptop`)  
- Tasks are **draggable**  
- Includes a **Create Task** button that opens a modal

#### Right: Calendar

- Visual calendar displaying tasks  
- Supports **Month / Week / Day** views  
- Tasks dragged from the left panel can be dropped onto specific days  
- View switch controls (Month / Week / Day)

### Create Task Modal

- Opens from the **Create Task** button on the Dashboard  
- Fields:
  - Task title  
  - Description (optional)  
  - Due date  
  - Priority (High / Medium / Low)  
  - Tag selector (`@home`, `@commute`, `@laptop`, `@outside`, `@school`)  
- Buttons:
  - Save Task  
  - Cancel  
- On save:
  - Adds the new task to the Task List  
  - Closes the modal

### Personal Homepage

- Shows basic user information (e.g., name or email)  
- Provides a **Sign out** option to log the user out and return to the login page

---

## Design System Summary

For full details, see `docs/design-system.md`.

### Typography

- Primary font: Inter, sans-serif (or similar clean system font)  
- H1: 32px, bold  
- H2: 24px, semi-bold  
- Body: 16px, regular  

### Colors

- Primary blue: `#3A7AFE`  
- Background: `#F7F9FC`  
- Text dark: `#1F2937`  
- Light gray: `#E5E7EB`  

### Spacing Scale

- 4px, 8px, 12px, 16px, 24px, 32px  
- Consistent spacing used for paddings, margins, and layout gaps

---

## Future Work

### Smart Priority Algorithm

We plan to add a smarter priority engine that helps users decide what to do next based on:

- Task deadlines  
- Required environment or device  
- User’s current situation (e.g., `@home`, `@commute`, `@laptop`)

The system will recommend the most suitable task to work on at any given moment, rather than just listing tasks.

### Long-term Goal Planning

We also plan to support long-term planning:

- Yearly or semester goals  
- Breaking goals into smaller task milestones  
- Visual progress tracking with progress bars  

---


