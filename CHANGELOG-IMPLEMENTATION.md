# Implementation Change Log

Short summary of the main implementation and UX changes made during the current refactor.

## Auth And Routing
- Added global auth state through `src/composables/useAuth.js`
- Initialize auth on startup and listen to Supabase auth state changes
- Persist auth across refreshes
- Protect these routes:
  - `/admin`
  - `/admin/:id`
  - `/management`
  - `/management/bulk`
- Redirect unauthenticated users to `/login`
- Redirect authenticated users away from `/login` to `/management`
- Added logout flow using `supabase.auth.signOut()`

## Navigation
- Removed top-level public `Events` navigation link
- Logo/title now links to homepage
- Guest navigation shows `Login`
- Authenticated navigation shows a `Management` dropdown
- Dropdown items:
  - Dashboard
  - Add Event
  - Bulk Add Event
  - Logout
- Dropdown closes on outside click and after selection
- Improved mobile navigation behavior

## Event Link Refactor
- `Facebook` link is no longer required
- UI now uses `Event Link`
- Forms save to `event_link`
- Added `src/lib/events.js` normalizer so old rows with `facebook_url` still work
- Removed scattered legacy field handling from views

## Event CRUD
- Add event works
- Edit event works
- Existing event loads and pre-populates form fields
- Duplicate event works by prefilling a new event from an existing row
- Delete event works with confirmation

## Homepage Discovery
- Added client-side search by:
  - title
  - organizer
  - location
- Grouped events by date
- Added category filter
- Added quick filters:
  - Upcoming
  - Today
  - This Weekend
  - Free
- `This Weekend` now shows only events from the current/upcoming weekend window rather than all future weekend events

## Event Detail Improvements
- Added Google Maps support using the existing free-text location field
- Google Maps URL is generated client-side with `encodeURIComponent(location)`
- Event detail page now shows:
  - clickable location text
- No API keys, Places API, or schema changes required
- Added small scanning icons for event detail metadata and actions
- Simplified maps UX so the location is the single clear Google Maps action
- Added an external-link affordance to the location row for clearer maps discoverability
- Removed duplicated organizer information from the detail facts grid
- Kept organizer directly below the event title for future organizer-link expansion
- Paid prices now display with `DKK` suffix on the detail page
- Event detail back navigation is now contextual:
  - from management detail links, back returns to `/management`
  - from public event browsing, back still returns to `/`

## Bulk Add
- Bulk Add now matches Add Event fields:
  - Title
  - Organizer
  - Category
  - Location
  - Description
  - Price
  - Event Link
  - Start Time
  - End Time
- Only difference:
  - Add Event uses one date
  - Bulk Add uses multiple dates
- Bulk Add UX:
  - selecting a date adds it immediately
  - no `Add Date` button
  - duplicate dates prevented
  - dates auto-sorted
  - selected dates shown as removable chips
- Price field no longer defaults to `Free`
- Price fields now use DKK-oriented helper text:
  - If the event is free, enter `0`

## Management Dashboard UX
- Replaced large dashboard intro with a compact toolbar
- Toolbar now shows:
  - Event Management
  - Upcoming Events count
  - `+ Add Event`
  - `+ Bulk Add Events`
- Event rows made more compact and easier to scan
- Event rows now link to the public event detail page from the content area
- Management-origin detail links now carry context so the detail page can return users to management
- Event title is primary
- Metadata is smaller and muted
- Actions are smaller and less visually dominant
- Added compact action buttons for management rows
- Removed icons from repeated row actions to reduce visual noise
- Action hierarchy:
  - Edit = primary
  - Duplicate = secondary outline
  - Delete = danger

## Styling And Color Hierarchy
- Refactored to a more semantic neutral palette
- Current intent:
  - off-white page background
  - white surfaces/cards/forms
  - dark primary text
  - warm gray secondary text
  - orange for primary actions, active states, and `FREE` badges
  - muted gold for category badges and subtle highlights
  - red for destructive actions
  - neutral borders
  - lighter shadows
- Management pages were made calmer and more tool-like
- Public event browsing styling was adjusted after review so the public list and admin tooling do not compete in the same way
- Removed icons from the management dropdown for a cleaner text-only admin menu

## Icons And Scanability
- Installed `lucide-vue-next`
- Added subtle inline icons to improve scanability without changing functionality
- Applied icons to:
  - Event cards
  - Event detail page
  - Management dashboard toolbar
  - Add/Edit/Delete/Bulk Add action buttons where they are not overly repetitive
- Category badges now use category-specific icons instead of a generic tag icon

## Category UX
- Centralized category configuration in `src/lib/eventPresentation.js`
- Shared category config now defines:
  - label
  - icon
  - badge class/style mapping
- Category visuals are now reused consistently across:
  - Event cards
  - Event detail view
  - Category filter labels
- Removed `Party` from category choices shown in forms
- Existing events with `Party` continue to render correctly
- Added subtle category-specific badge styles for:
  - Social
  - Class
  - Workshop
  - Festival
  - Bootcamp
  - Competition

## Price Display
- Free events continue to display as `FREE`
- Numeric paid prices now display as:
  - `100 DKK`
  - `250 DKK`
  - `800 DKK`
- Existing non-numeric custom price text continues to render as entered

## Form Layout Refinements
- Add Event form now groups date and time fields more clearly:
  - Date on its own line
  - Start Time and End Time on the next line side by side
- Add Event form placeholders were removed only for:
  - Title
  - Organizer

## Cleanup
- Removed old local mock event data file
- Added a centralized event normalizer helper
- Kept other Add Event placeholders for helper context:
  - Location
  - Description
  - Price
  - Event Link
