# Bib Journal - Your Racing Journal

A web-based journal application that allows runners and athletes to document and preserve their racing achievements through a visual, scrapbook-style interface featuring race bibs, medals, finisher photos, and route maps.

## Features

### Core Features (MVP)

- **Race Entry Management**: Add, edit, and delete race entries with all relevant information
- **Automatic Background Removal**: Automatically remove backgrounds from bib and medal photos using AI
- **GPX Route Visualization**: Visualize race routes from GPX files as clean line drawings
- **Multiple View Modes**: Grid, List, and Column views for browsing race entries
- **Image Toggle**: Switch between original and processed versions of bib/medal photos
- **Local Storage**: All data stored locally in IndexedDB (no cloud required)

### Race Entry Fields

- Race Name (required)
- Race Type (Marathon, Half Marathon, 10K, 5K, Trail Race, Triathlon, Ultra, Other)
- Location (City, Track Name, or Trail Name)
- Date
- Race Results (optional):
  - Finish Time
  - Overall Place
  - Age Group Place
  - Division
- Bib Photo (required, with automatic background removal)
- Finisher Photo (optional)
- Medal Photo (optional, with automatic background removal)
- GPX File (optional, for route visualization)
- Notes (optional, personal reflections)

## Technology Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS
- **Storage**: Dexie.js (IndexedDB wrapper)
- **Image Processing**: @imgly/background-removal for automatic background removal
- **GPX Parsing**: Custom GPX parser for route data extraction
- **Date Handling**: date-fns for date formatting

## Getting Started

### Prerequisites

- Node.js 20+ (or 22+ recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BibBox
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── Home.jsx        # Main home screen with race entries
│   ├── RaceForm.jsx    # Add/Edit race form
│   ├── RaceDetail.jsx  # Individual race detail view
│   ├── ImageToggle.jsx # Toggle between original/processed images
│   ├── RouteVisualization.jsx  # GPX route visualization
│   ├── ViewToggle.jsx  # View mode toggle buttons
│   ├── EmptyState.jsx  # Empty state component
│   └── FloatingActionButton.jsx  # FAB for adding races
├── hooks/              # Custom React hooks
│   ├── useRaceEntries.js  # Race entries data management
│   └── useViewMode.js     # View mode preference management
├── lib/                # Utility libraries
│   ├── db.js          # IndexedDB database setup
│   ├── imageProcessing.js  # Image processing utilities
│   └── gpxParser.js   # GPX file parsing
├── App.jsx            # Main app component
├── main.jsx           # App entry point
└── index.css          # Global styles
```

## Usage

### Adding a Race Entry

1. Click the "Add Race" button in the header or the floating "+" button
2. Fill in the required fields (Race Name, Race Type, Location, Date, Bib Photo)
3. Optionally add race results, finisher photo, medal photo, GPX file, and notes
4. Click "Save" - the app will automatically process images (background removal) and parse GPX files

### Viewing Races

- **Grid View**: Default view showing race bib thumbnails in a grid
- **List View**: Compact list with thumbnails and key information
- **Column View**: Single column with larger cards showing more details

Use the view toggle buttons in the header to switch between views.

### Viewing Race Details

Click on any race entry to view full details:
- Race bib with toggle between original/processed versions
- Complete race information and results
- Finisher photo
- Medal with toggle between original/processed versions
- Route visualization (if GPX file provided)
- Personal notes

### Editing/Deleting Races

From the race detail view:
- Click "Edit" to modify the race entry
- Click "Delete" to remove the race entry (action cannot be undone)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern mobile browsers

Note: Background removal requires WebAssembly support, which is available in all modern browsers.

## Data Storage

All data is stored locally in your browser using IndexedDB. This means:
- Your data stays on your device
- No account or cloud storage required
- Data persists across browser sessions
- No internet connection needed after initial load

⚠️ **Important**: Clearing your browser data will delete all stored race entries. Consider exporting your data regularly if this is a concern.

## Performance

- Background removal typically takes 3-5 seconds per image
- Image compression ensures efficient storage
- Lazy loading and optimization for smooth scrolling
- Progressive Web App (PWA) ready (can be enhanced for offline-first experience)

## Future Enhancements

### Post-MVP Features
- Search and filter by name, location, type, or year
- Statistics dashboard (total races, distance, breakdown by type)
- Social sharing (export race entries as images)
- Import/Export functionality (JSON backup/restore)

### Future Features
- Multi-user support with profiles
- Achievement badges
- Goal tracking
- Integration with Strava, Garmin, or other fitness apps
- Community features

## Development

### Code Style

The project uses:
- ESLint for code linting
- Prettier (recommended) for code formatting
- React best practices

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## Acknowledgments

- Built with React and Vite
- Styled with Tailwind CSS
- Image processing powered by @imgly/background-removal
- Inspired by physical race scrapbooks and journals