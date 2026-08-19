// Distinct titles per route: with one shared title Next's route announcer
// never fires, so client navigation is silent for screen readers.
export const metadata = { title: 'History' };

export default function HistoryLayout({ children }) {
  return children;
}
