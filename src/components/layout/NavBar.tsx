"use client";

import { useRouter } from "next/navigation";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface NavbarProps {
  courseCode?: string | null;
  pageLabel?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  breadcrumbs?: BreadcrumbItem[];
}

export default function NavBar({
  courseCode,
  pageLabel,
  showBack,
  onBack,
  breadcrumbs,
}: NavbarProps) {
  const router = useRouter();

  const items: BreadcrumbItem[] = breadcrumbs ?? [
    ...(courseCode
      ? [{ label: courseCode, onClick: onBack ?? (() => router.back()) }]
      : []),
    ...(pageLabel ? [{ label: pageLabel }] : []),
  ];

  return (
    <header className="flex items-center gap-2 px-4 h-11 border-b border-gray-200 bg-white shrink-0">
      <button className="text-gray-400 hover:text-gray-600 shrink-0">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="5" x2="21" y2="5" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="19" x2="21" y2="19" />
        </svg>
      </button>

      <div className="flex items-center gap-1.5 text-sm min-w-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <div key={index} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <span className="text-gray-300 text-base leading-none shrink-0">›</span>
              )}

              {/* FIX: Removed `&& !isLast` — middle items with onClick must be clickable */}
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className={
                    isLast
                      ? "text-gray-500 truncate hover:underline"
                      : "font-semibold text-gray-800 hover:underline shrink-0"
                  }
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={
                    isLast
                      ? "text-gray-500 truncate"
                      : "font-semibold text-gray-800 shrink-0"
                  }
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </header>
  );
}