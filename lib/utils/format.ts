export function formatDate(isoDate?: string): string {
  if (!isoDate) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatDateWindow(start?: string, end?: string): string {
  if (!start && !end) {
    return "No date range";
  }

  if (start && end) {
    const startDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
    }).format(new Date(start));
    const endDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
    }).format(new Date(end));
    return `${startDate} - ${endDate}`;
  }

  return start ? `Starts ${formatDate(start)}` : `Ends ${formatDate(end)}`;
}

export function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) {
    return "Just now";
  }

  const timestamp = new Date(isoDate).getTime();
  const deltaMs = timestamp - Date.now();
  const minutes = Math.round(deltaMs / (1000 * 60));

  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}
