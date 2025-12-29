# DataAnalyze Helper UI Design System - Style Guide

## Overview

基于 MotherDuck 设计系统，采用 **Bold, Playful, Technical** 的设计风格：
- **Brutalist design** - 粗边框、高对比度
- **Vibrant colors** - 鲜艳的配色方案
- **Inter font** - 现代技术感字体
- **Shadow-based hover** - 阴影悬停效果

---

## Color Palette

### Primary Colors
```css
--beige-background: #F4EFEA;    /* 主页面背景 */
--white: #FFFFFF;               /* 卡片背景 */
--dark: #383838;                /* 主要文字、边框 */
--dark-gray: #2D2D2D;           /* 深色区域 */
```

### Brand Colors
```css
--primary-yellow: #FFD500;      /* 主要强调色 */
--primary-blue: #6FC2FF;        /* 主要按钮 */
--cyan: #4DD4D0;                /* 次要强调 */
--light-blue: #5CB8E6;          /* 第三强调 */
--coral: #FF6B6B;               /* 错误/警告 */
```

### Text Colors
```css
--text-primary: #383838;        /* 主要文字 */
--text-secondary: #666666;      /* 次要文字 */
--text-light: #999999;          /* 浅色文字 */
```

---

## Typography

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale
| Element | Size | Weight | Tailwind |
|---------|------|--------|----------|
| Hero H1 | 48-64px | 700 | `text-5xl font-bold tracking-tight` |
| Section H2 | 32-40px | 700 | `text-3xl font-bold tracking-tight` |
| Card H3 | 20-24px | 600 | `text-xl font-semibold` |
| Body | 16px | 400 | `text-base` |
| Small | 14px | 500 | `text-sm font-medium` |
| Caption | 12px | 700 | `text-xs font-bold uppercase tracking-widest` |

---

## Border & Shadow System

### Borders
```css
/* Standard border */
border: 2px solid #383838;

/* Thick border */
border: 3px solid #383838;
```

### Shadows (Hover Effects)
```css
/* Default state */
box-shadow: none;

/* Hover state - offset shadow */
box-shadow: 4px 4px 0px #383838;

/* Active state */
box-shadow: 2px 2px 0px #383838;
```

---

## Component Styles

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: #FFD500;
  color: #383838;
  border: 2px solid #383838;
  font-weight: 700;
  text-transform: uppercase;
  padding: 12px 24px;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px #383838;
}

/* Secondary Button */
.btn-secondary {
  background: #FFFFFF;
  color: #383838;
  border: 2px solid #383838;
}
```

### Cards
```css
.card {
  background: #FFFFFF;
  border: 2px solid #383838;
  padding: 24px;
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px #383838;
}
```

### Input Fields
```css
.input {
  background: #FFFFFF;
  border: 2px solid #383838;
  padding: 12px 16px;
  font-size: 16px;
}

.input:focus {
  outline: none;
  box-shadow: 4px 4px 0px #383838;
}
```

---

## Spacing System

| Value | Pixels | Usage |
|-------|--------|-------|
| 1 | 4px | Micro spacing |
| 2 | 8px | Tight spacing |
| 3 | 12px | Small gaps |
| 4 | 16px | Default gap |
| 6 | 24px | Medium spacing |
| 8 | 32px | Large spacing |
| 12 | 48px | Section gaps |
| 16 | 64px | Major sections |

---

## Animation & Transitions

```css
/* Standard transition */
transition: all 0.15s ease;

/* Hover transform */
transform: translate(-2px, -2px);

/* Active transform */
transform: translate(-1px, -1px);
```
