"use client";
import { useState } from "react";
interface OutcomeGroup { id: number; name: string; expanded: boolean; }
export default function CourseOutcomesPage() {
  const [tab,setTab]=useState<"manage"|"alignments">("manage");
  const [groups,setGroups]=useState<OutcomeGroup[]>([{id:1,name:"ad",expanded:true}]);
  const [newGroup,setNewGroup]=useState(false);
  const [groupName,setGroupName]=useState("");
  const addGroup=()=>{
    if(!groupName.trim())return;
    setGroups(prev=>[...prev,{id:Date.now(),name:groupName,expanded:true}]);
    setGroupName("");setNewGroup(false);
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-gray-800">Outcomes</h1>
        <div className="flex gap-2">
          <button className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">Import</button>
          <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">+ Create</button>
          <button className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">Find</button>
        </div>
      </div>
      <div className="flex border-b border-gray-100 px-8">
        {(["manage","alignments"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${tab===t?"border-blue-500 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t==="manage"?"Manage":"Alignments"}
          </button>
        ))}
      </div>
      {tab==="manage"?(
        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-gray-100 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-600 mb-3">Outcome Groups</h3>
            {groups.map(g=>(
              <div key={g.id}>
                <div className="flex items-center gap-1.5 mb-1">
                  <button onClick={()=>setGroups(prev=>prev.map(x=>x.id===g.id?{...x,expanded:!x.expanded}:x))} className="text-gray-400 text-xs">{g.expanded?"v":">"}</button>
                  <span className="text-xs text-blue-600 font-medium">{g.name}</span>
                </div>
                {g.expanded&&(
                  <div className="ml-6 mb-2">
                    <p className="text-xs text-gray-400 mb-2 italic">No outcomes yet.</p>
                    <button onClick={()=>setNewGroup(true)} className="text-xs text-gray-500 hover:text-gray-700">+ Create New Group</button>
                  </div>
                )}
              </div>
            ))}
            {newGroup&&(
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Group name"
                  onKeyDown={e=>e.key==="Enter"&&addGroup()}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none mb-2"/>
                <div className="flex gap-1.5">
                  <button onClick={()=>{setNewGroup(false);setGroupName("");}} className="flex-1 py-1 border border-gray-200 rounded text-xs text-gray-500">Cancel</button>
                  <button onClick={addGroup} className="flex-1 py-1 bg-blue-600 text-white rounded text-xs">Create</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 p-6"><p className="text-xs text-gray-400">Select an outcome group to view outcomes.</p></div>
        </div>
      ):(
        <div className="flex-1 p-8"><p className="text-xs text-gray-400">No alignments found.</p></div>
      )}
      <div className="border-t border-gray-100 px-8 py-2 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-500">0 Outcomes Selected</span>
        <div className="flex gap-3">
          <button className="text-xs text-gray-400 hover:text-red-500">Remove</button>
          <button className="text-xs text-gray-400 hover:text-gray-600">Move</button>
        </div>
      </div>
    </div>
  );
}