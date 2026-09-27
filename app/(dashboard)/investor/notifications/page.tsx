import { NotificationPreferences, NotificationList } from "@/components/dashboard";

export default function NotificationPreferencesPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <NotificationList />
      <NotificationPreferences />
    </div>
  );
}

