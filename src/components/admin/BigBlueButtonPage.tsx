"use client";

// src/components/admin/BigBlueButtonPage.tsx

import { useState } from "react";

export default function BigBlueButtonPage() {
  const [newOpen,       setNewOpen]       = useState(true);
  const [concludedOpen, setConcludedOpen] = useState(true);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mb-4">
        <button className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700">
          + Add Conference
        </button>
      </div>

      {/* New Conferences */}
      <div className="border border-gray-200 rounded mb-4 overflow-hidden">
        <div
          className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none"
          onClick={() => setNewOpen(o => !o)}>
          <span className="text-xs text-gray-500">{newOpen ? "▾" : "▸"}</span>
          <span className="text-sm font-medium text-gray-700">New Conferences</span>
        </div>
        {newOpen && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            There are no new conferences
          </div>
        )}
      </div>

      {/* Concluded Conferences */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <div
          className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none"
          onClick={() => setConcludedOpen(o => !o)}>
          <span className="text-xs text-gray-500">{concludedOpen ? "▾" : "▸"}</span>
          <span className="text-sm font-medium text-gray-700">Concluded Conferences</span>
        </div>
        {concludedOpen && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            There are no concluded conferences
          </div>
        )}
      </div>
    </div>
  );
}