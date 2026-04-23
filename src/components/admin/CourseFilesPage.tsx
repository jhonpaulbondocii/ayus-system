"use client";
import { useState, useRef } from "react";
interface FileItem { id: number; name: string; size: string; createdAt: string; }
export default function CourseFilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now()+Math.random(),
      name: f.name,
      size: f.size<1024?`${f.size} B`:f.size<1048576?`${(f.size/1024).toFixed(1)} KB`:`${(f.size/1048576).toFixed(1)} MB`,
      createdAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
    }));
    setFiles(prev=>[...prev,...newFiles]);
  };
  const toggleSelect = (id: number) => setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Files</h1>
        <div className="flex gap-2">
          <button className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">Switch to Old Files Page</button>
          <button className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">All My Files</button>
          <button className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">+ Folder</button>
          <button onClick={()=>inputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded">Upload</button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e=>e.target.files&&handleFiles(e.target.files)}/>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-600 mb-1">Search files</p>
        <div className="flex gap-2">
          <input placeholder="Search files..." className="border border-gray-200 rounded px-3 py-2 text-xs w-96 focus:outline-none"/>
          <button className="px-4 py-2 border border-gray-200 rounded text-xs text-gray-600">Search</button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Enter at least 2 characters to search</p>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">ad</span>
        <div className="flex gap-3 items-center">
          <span className="text-xs text-gray-400">{selected.length} selected</span>
          <button onClick={()=>setFiles(prev=>prev.filter(f=>!selected.includes(f.id)))} className="text-gray-300 hover:text-red-500 text-xs">Delete</button>
        </div>
      </div>
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}}
        className={`border-2 border-dashed rounded-lg transition-colors ${dragging?"border-blue-400 bg-blue-50":"border-gray-200"}`}>
        {files.length===0?(
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
            </div>
            <p className="text-base font-medium text-gray-500 mb-1">Drop files here to upload</p>
            <button onClick={()=>inputRef.current?.click()} className="text-sm text-blue-500 hover:underline">or choose files</button>
          </div>
        ):(
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 text-xs text-gray-500 font-medium">
              <th className="px-4 py-2.5 w-8"><input type="checkbox" onChange={e=>setSelected(e.target.checked?files.map(f=>f.id):[])} className="rounded"/></th>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Created</th>
              <th className="text-left px-4 py-2.5">Last Modified</th>
              <th className="text-left px-4 py-2.5">Modified By</th>
              <th className="text-left px-4 py-2.5">Size</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {files.map(f=>(
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(f.id)} onChange={()=>toggleSelect(f.id)} className="rounded"/></td>
                  <td className="px-4 py-3 text-xs text-blue-600 cursor-pointer hover:underline">{f.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{f.createdAt}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{f.createdAt}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">Admin</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{f.size}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200">unpublished</span></td>
                  <td className="px-4 py-3"><button onClick={()=>setFiles(prev=>prev.filter(x=>x.id!==f.id))} className="text-gray-300 hover:text-red-500 text-sm">x</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-2">0 bytes of 500 MB used</p>
    </div>
  );
}