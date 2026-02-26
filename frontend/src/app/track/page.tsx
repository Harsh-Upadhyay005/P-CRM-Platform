import { redirect } from 'next/navigation';

// Redirect /track to /track/lookup which renders the full search UI.
// The [trackingId] page does not rely on the URL param, so this is a clean entry point.
export default function TrackIndexPage() {
  redirect('/track/lookup');
}
