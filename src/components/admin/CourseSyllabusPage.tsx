"use client";
import { useState } from "react";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_MINI = ["S","M","T","W","T","F","S"];
function MiniCalendar() {
  const today = new Date();
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const first=new Date(year,month,1).getDay();
  const days=new Date(year,month+1,0).getDate();
  const cells:(number|null)[]=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  while(cells.length%7!==0)cells.push(null);
  return (
    <div className="w-52 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <button onClick={()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1)} className="text-gray-400 px-1">prev</button>
        <span className="text-xs font-semibold text-gray-600">{MONTHS[month]} {year}</span>
        <button onClick={()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1)} className="text-gray-400 px-1">next</button>
      </div>
      <div className="grid grid-cols-7 mb-1">{DAYS_MINI.map((d,i)=><div key={i} className="text-center text-xs text-gray-400">{d}</div>)}</div>
      <div className="grid grid-cols-7">
        {cells.map((day,i)=>{
          const isToday=day!==null&&day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
          return <button key={i} className={`text-xs w-6 h-6 flex items-center justify-center rounded-full mx-auto ${!day?"invisible":"hover:bg-gray-100"} ${isToday?"border border-blue-400 text-blue-500 font-bold":"text-gray-600"}`}>{day||""}</button>;
        })}
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3"><p className="text-xs text-gray-400">Course assignments are not weighted.</p></div>
    </div>
  );
}
export default function CourseSyllabusPage() {
  const [editing,setEditing]=useState(false);
  const [body,setBody]=useState("The syllabus page shows a table-oriented view of the course schedule, and the basics of course grading. You can add any other comments, notes, or thoughts you have about the course structure, course policies or anything else.\n\nTo add some comments, click the \"Edit\" link at the top.");
  return (
    <div className="flex gap-8 px-8 py-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Course Syllabus</h1>
          <div className="flex gap-2">
            <button className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">Jump to Today</button>
            <button onClick={()=>setEditing(e=>!e)} className="text-xs border border-gray-200 px-3 py-1.5 rounded text-gray-600">{editing?"Done":"Edit"}</button>
          </div>
        </div>
        {editing?(
          <textarea value={body} onChange={e=>setBody(e.target.value)} className="w-full border border-gray-200 rounded-lg p-4 text-sm text-gray-600 h-48 resize-none focus:outline-none mb-6"/>
        ):(
          <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">{body}</p>
        )}
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Course Summary:</h2>
        <div className="border-b border-gray-200">
          <div className="grid grid-cols-3 text-xs font-medium text-gray-500 pb-2 border-b border-gray-200">
            <span>Date</span><span>Details</span><span className="text-right">Due</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 italic">No assignments due.</p>
      </div>
      <MiniCalendar/>
    </div>
  );
}