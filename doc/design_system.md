# Design System Notes

## 1. Typography

We use a clean sans-serif typeface suitable for productivity tools.

**Primary Font:** Inter, sans-serif  
**Fallback:** Helvetica, Arial, sans-serif

### Font Sizes

- **H1:** 32px / Bold
- **H2:** 24px / Semi-bold
- **H3:** 20px / Medium
- **Body:** 16px / Regular
- **Caption / Label:** 14px

### Line Height

- Default line-height: **1.5**

### Usage

- Headings: page titles, section headers, modal titles
- Body: task cards, labels, form text
- Caption: subtle UI elements, helper text

---

## 2. Color Palette

Colors are inspired by a bright productivity aesthetic—clean whites paired with a bold blue for clarity and focus.

### Core Colors

- **Primary Blue:** `#3A7AFE`
- **Primary Blue Hover:** `#2E63D8`
- **Accent Green (success/progress):** `#5CCD83`
- **Accent Red (high priority):** `#FF6B6B`

### Neutral Colors

- **Background:** `#F7F9FC`
- **White:** `#FFFFFF`
- **Light Gray:** `#E5E7EB`
- **Border Gray:** `#D1D5DB`
- **Text Dark:** `#1F2937`
- **Text Medium:** `#4B5563`

### Shadow

- Soft shadow for cards and modals:  
  `0px 4px 12px rgba(0,0,0,0.08)`

---

## 3. Spacing System

We follow a simple 4-based spacing scale to maintain consistent layout rhythm.

### Scale

- **4px — XS**
- **8px — S**
- **12px — SM**
- **16px — M**
- **24px — L**
- **32px — XL**
- **48px — XXL**

### Usage

- 16–24px: default padding on cards and containers
- 8px: spacing between form elements
- 32px+: section spacing on large screens

---

## 4. UI Components (Optional but recommended)

### Buttons

- **Primary Button**

  - Background: Primary Blue `#3A7AFE`
  - Text: White
  - Radius: 8px
  - Padding: 12px 20px

- **Secondary Button**
  - Border: 1px solid `#D1D5DB`
  - Background: White
  - Text: Text Dark

### Input Fields

- Background: White
- Border: 1px solid `#D1D5DB`
- Radius: 6px
- Height: 44px
- Padding: 0 12px

### Modal (Add Task)

- Max width: 420px
- Background: White
- Padding: 24px
- Radius: 12px
- Shadow: soft (see above)
- Backdrop: `rgba(0,0,0,0.25)`

---

## 5. Icon Style (Optional)

- Line-based icons
- Rounded edges
- 24px standard size

---

## 6. Layout Rules

- 2-column layout for the portal:
  - Left: Task List (30%)
  - Right: Calendar View (70%)
- Maintain 24–32px padding around outer edges
- Use white space intentionally to prioritize clarity

---
