# Fabric.js Canvas Editor

A Canva-like design editor built with **Fabric.js 5**, **React 18**, and **TypeScript**.

## Features

- Shape tools (rectangle, circle, triangle, diamond, etc.)
- Text editing with font selection and sizing
- Drawing / freehand mode
- Image upload and filters
- Fill color, stroke color, stroke width controls
- Opacity and layer management
- Clipboard (copy/paste)
- Undo/redo history
- Keyboard shortcuts (hotkeys)
- Auto-resize canvas
- Pexels stock photo integration
- AI background removal sidebar
- Export to PNG/JPG/SVG/JSON

## Tech Stack

- [Fabric.js](http://fabricjs.com/) 5.3.0 - Canvas rendering
- [React](https://react.dev/) 18 - UI framework
- [TypeScript](https://www.typescriptlang.org/) 5 - Type safety
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Shadcn UI](https://ui.shadcn.com/) + Radix - Component library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

## Project Structure

```
src/features/editor/
├── components/          # UI components
│   ├── editor.tsx       # Main editor component
│   ├── sidebar.tsx      # Left sidebar with tools
│   ├── toolbar.tsx      # Top toolbar
│   ├── navbar.tsx       # Navigation bar
│   ├── footer.tsx       # Bottom bar (zoom, etc.)
│   ├── color-picker.tsx # Color selection
│   ├── shape-sidebar.tsx
│   ├── text-sidebar.tsx
│   ├── font-sidebar.tsx
│   ├── image-sidebar.tsx
│   ├── draw-sidebar.tsx
│   ├── filter-sidebar.tsx
│   ├── layers-sidebar.tsx
│   ├── ai-sidebar.tsx
│   ├── pexels-sidebar.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── use-editor.ts    # Main editor hook (800+ lines)
│   ├── use-history.ts   # Undo/redo
│   ├── use-clipboard.ts # Copy/paste
│   ├── use-hotkeys.ts   # Keyboard shortcuts
│   ├── use-auto-resize.ts
│   ├── use-canvas-events.ts
│   ├── use-load-state.ts
│   └── use-window-events.ts
├── types.ts             # TypeScript types & interfaces
└── utils.ts             # Helper functions
```

## Usage

Drop the `src/features/editor/` directory into any Next.js project with Fabric.js installed:

```bash
npm install fabric@5.3.0-browser
```

Then import and use:

```tsx
import { Editor } from "@/features/editor/components/editor";

<Editor initialData={projectData} />
```

## License

MIT
