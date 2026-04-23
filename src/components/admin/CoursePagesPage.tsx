"use client";
import { useState } from "react";
interface Page { id: number; title: string; updatedAt: string; published: boolean; }
export default function CoursePagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const addPage = () => {
    if (!title.trim()) return;
    setPages(prev => [...prev, { id: Date.now(), title, published: false,
      updatedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}) }]);
    setTitle(""); setModal(false);
  };
  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Pages</h1>
        <div className="flex gap-2">
          <button onClick={()=>setModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded">+ Page</button>
          <button className="w-8 h-8 flex items-center justify-center text-gray-400 border border-gray-200 rounded">...</button>
        </div>
      </div>
      {pages.length===0 ? (
        <p className="text-sm text-gray-500">No pages created yet. <button onClick={()=>setModal(true)} className="text-blue-600 hover:underline">Add one!</button></p>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
              <th className="text-left px-4 py-2.5">Title</th>
              <th className="text-left px-4 py-2.5">Last Updated</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="w-8"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {pages.map(p=>(
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-blue-600 cursor-pointer hover:underline">{p.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{p.updatedAt} by Admin</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200">Unpublished</span></td>
                  <td className="px-4 py-3"><button onClick={()=>setPages(prev=>prev.filter(x=>x.id!==p.id))} className="text-gray-300 hover:text-red-500 text-sm">x</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-xl w-80 p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Create Page</h2>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Page title"
              onKeyDown={e=>e.key==="Enter"&&addPage()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none"/>
            <div className="flex gap-2">
              <button onClick={()=>{setModal(false);setTitle("");}} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button onClick={addPage} className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}