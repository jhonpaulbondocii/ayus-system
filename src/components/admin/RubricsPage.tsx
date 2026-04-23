"use client";

// src/components/admin/RubricsPage.tsx

export default function RubricsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="flex justify-end mb-4">
        <button className="px-4 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
          + Add Rubric
        </button>
      </div>
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        No rubrics yet.
      </div>
    </div>
  );
}