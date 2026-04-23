import Link from "next/link";

export default function RightPanel() {
  return (
    <div className="w-56 bg-gray-50 border-l border-gray-200 flex flex-col p-4 shrink-0">

      {/* Coming Up */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Coming up</span>
          <Link
            href="/calendar"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            📅 View calendar
          </Link>
        </div>
        <p className="text-xs text-gray-400">Nothing for the next week.</p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button className="w-full text-left px-3 py-2.5 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
          Start a new course
        </button>
        <button className="w-full text-left px-3 py-2.5 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
          View Grades
        </button>
      </div>

    </div>
  );
}