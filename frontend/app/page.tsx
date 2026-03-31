"use client";

import { useState } from "react";
import { Dumbbell, UtensilsCrossed, TrainFront, Beer, Flag, Scissors, Bike, Library, Send, MapPin, GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Mock Data
const MOCK_LISTINGS = [
  {
    id: "listing-1", address: "1234 Commonwealth Ave, Boston, MA", monthlyCost: 1850,
    ratings: { gym: 5, restaurant: 4, train: 5, bar: 4, golf: 2, barber: 3, bluebike: 5, library: 4 },
  },
  {
    id: "listing-2", address: "587 Tremont St, Boston, MA", monthlyCost: 2200,
    ratings: { gym: 3, restaurant: 5, train: 4, bar: 5, golf: 1, barber: 4, bluebike: 4, library: 5 },
  },
  {
    id: "listing-3", address: "42 Park Dr, Boston, MA", monthlyCost: 1600,
    ratings: { gym: 4, restaurant: 3, train: 3, bar: 3, golf: 3, barber: 5, bluebike: 3, library: 2 },
  },
];

const PREFS = [
  { id: "gym", label: "Gyms", icon: Dumbbell },
  { id: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { id: "train", label: "Train Stations", icon: TrainFront },
  { id: "bar", label: "Bars", icon: Beer },
  { id: "golf", label: "Golf Ranges", icon: Flag },
  { id: "barber", label: "Barber Shops", icon: Scissors },
  { id: "bluebike", label: "Bluebike Stations", icon: Bike },
  { id: "library", label: "Libraries", icon: Library },
];

function SortableItem({ id, item, rank }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = item.icon;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-[var(--ns-border)] rounded-lg shadow-sm mb-2 hover:shadow-md" {...attributes} {...listeners}>
      <span className="font-bold text-[var(--ns-text-muted)] w-4 text-center">{rank}</span>
      <Icon className="w-5 h-5 text-[var(--ns-text-secondary)]" />
      <span className="flex-1 font-medium text-[var(--ns-text-primary)]">{item.label}</span>
      <GripVertical className="w-5 h-5 text-[var(--ns-text-muted)] cursor-grab" />
    </div>
  );
}

export default function Home() {
  const [school, setSchool] = useState("");
  const [schoolSelected, setSchoolSelected] = useState(false);
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [rankedPrefs, setRankedPrefs] = useState<string[]>([]);
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hey! I'm NestScout. Set your school and preferences on the left, then ask me anything about finding your perfect place in Boston." }]);
  const [input, setInput] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [activeListing, setActiveListing] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const handlePrefToggle = (id: string) => {
    if (selectedPrefs.includes(id)) {
      setSelectedPrefs(selectedPrefs.filter((p) => p !== id));
      setRankedPrefs(rankedPrefs.filter((p) => p !== id));
    } else {
      if (selectedPrefs.length < 5) {
        setSelectedPrefs([...selectedPrefs, id]);
        setRankedPrefs([...rankedPrefs, id]);
      }
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rankedPrefs.indexOf(active.id);
      const newIndex = rankedPrefs.indexOf(over.id);
      setRankedPrefs(arrayMove(rankedPrefs, oldIndex, newIndex));
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Great picks! Based on your preferences near Boston University, here are 3 listings that score well for what you care about. Click any row to explore the neighborhood on the map." },
      ]);
      setIsTyping(false);
      setShowTable(true);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-[var(--ns-bg-primary)] p-4 sm:p-6 overflow-hidden max-w-[1400px] mx-auto gap-6 sm:gap-8 flex-col lg:flex-row font-body">
      
      {/* LEFT PANEL */}
      <div className="w-full lg:w-[380px] flex flex-col gap-6 overflow-y-auto pr-2 pb-10 lg:pb-0 shrink-0 custom-scrollbar">
        <div className="mb-2 mt-2">
          <h1 className="text-4xl font-display font-bold text-[var(--ns-text-primary)] tracking-tight">NestScout</h1>
          <p className="text-[15px] font-medium text-[var(--ns-text-secondary)] mt-1">Boston, MA</p>
        </div>

        {/* School Input */}
        <div className="bg-white border flex flex-col gap-3 p-5 rounded-2xl shadow-sm border-[var(--ns-border)]">
          <label className="text-[13px] uppercase tracking-[0.04em] font-semibold text-[var(--ns-text-secondary)]">Your School</label>
          {!schoolSelected ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={school} 
                onChange={(e) => setSchool(e.target.value)} 
                placeholder="Type 'Boston University'" 
                className="w-full px-3 py-2 border rounded-lg border-[var(--ns-border)] focus:outline-none focus:border-2 focus:border-[var(--ns-accent)] disabled:bg-gray-100 transition-all text-[15px]"
              />
              <button 
                disabled={school.toLowerCase() !== "boston university"}
                onClick={() => setSchoolSelected(true)}
                className="px-4 py-2 bg-[var(--ns-accent)] disabled:bg-[#f3b5a9] text-white rounded-lg font-medium transition-colors hover:bg-[var(--ns-accent-hover)] cursor-pointer disabled:cursor-not-allowed">
                Set
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[var(--ns-accent-subtle)] text-[#b03019] px-4 py-3 rounded-lg font-medium border border-[#ffd5cc]">
              <span className="flex items-center gap-2 text-[15px]"><MapPin className="w-4 h-4" /> Boston University</span>
              <button onClick={() => setSchoolSelected(false)} className="text-[13px] underline cursor-pointer hover:text-[var(--ns-accent)]">Edit</button>
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className={`bg-white border flex flex-col gap-4 p-5 rounded-2xl shadow-sm transition-all duration-300 border-[var(--ns-border)] ${!schoolSelected ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-end">
            <label className="text-[13px] uppercase tracking-[0.04em] font-semibold text-[var(--ns-text-secondary)]">What matters near your home?</label>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {PREFS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPrefs.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handlePrefToggle(p.id)}
                  className={`flex flex-row items-center gap-1.5 px-3.5 py-2 rounded-[20px] text-[15px] font-medium transition-all duration-150 ${isSelected ? 'bg-[var(--ns-accent)] text-white border-transparent shadow-[0_2px_4px_rgba(232,85,58,0.2)] translate-y-[-1px]' : 'bg-white text-[var(--ns-text-secondary)] border border-[var(--ns-border)] hover:bg-[var(--ns-bg-secondary)]'}`}
                >
                  <Icon className="w-4 h-4" /> {p.label}
                </button>
              );
            })}
          </div>
          <p className="text-[13px] text-[var(--ns-text-muted)] font-medium"><span className={selectedPrefs.length >=3 ? 'text-[var(--ns-success)]' : ''}>{selectedPrefs.length}</span> of 3–5 selected</p>
        </div>

        {/* Ranker */}
        <div className={`bg-white border flex flex-col p-5 rounded-2xl shadow-sm border-[var(--ns-border)] transition-opacity duration-300 ${selectedPrefs.length >= 3 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="mb-4">
            <label className="text-[13px] uppercase tracking-[0.04em] font-semibold text-[var(--ns-text-secondary)] block">Rank your priorities</label>
            <p className="text-[13px] text-[var(--ns-text-muted)] mt-1">Drag to reorder — #1 matters most</p>
          </div>
          
          <div className="flex flex-col">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rankedPrefs} strategy={verticalListSortingStrategy}>
                {rankedPrefs.map((id, index) => {
                   const item = PREFS.find(p => p.id === id);
                   return <SortableItem key={id} id={id} item={item} rank={index + 1} />;
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[var(--ns-border)] overflow-hidden relative">
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col gap-6 bg-[var(--ns-bg-primary)] custom-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${m.role === "user" ? "bg-[var(--ns-accent)] text-white rounded-br-sm" : "bg-white border border-[var(--ns-border)] text-[var(--ns-text-primary)] rounded-bl-sm"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex w-full justify-start">
               <div className="px-5 py-4 bg-white border border-[var(--ns-border)] text-[var(--ns-text-muted)] rounded-2xl rounded-bl-sm shadow-sm flex gap-1.5 items-center">
                 <div className="w-2 h-2 rounded-full bg-[var(--ns-border-strong)] animate-pulse"></div>
                 <div className="w-2 h-2 rounded-full bg-[var(--ns-border-strong)] animate-pulse delay-75"></div>
                 <div className="w-2 h-2 rounded-full bg-[var(--ns-border-strong)] animate-pulse delay-150"></div>
               </div>
             </div>
          )}

          {/* Table appears here */}
          {showTable && (
            <div className="w-full bg-white border border-[var(--ns-border)] shadow-sm rounded-xl mt-2 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-[var(--ns-border)] bg-[var(--ns-bg-secondary)] text-[var(--ns-text-secondary)]">
                      <th className="px-5 py-4 font-semibold text-[13px] uppercase tracking-[0.04em]">Cost/mo</th>
                      <th className="px-5 py-4 font-semibold text-[13px] uppercase tracking-[0.04em]">Address</th>
                      {rankedPrefs.map(id => {
                        const icon = PREFS.find(p => p.id === id)?.icon;
                        const Comp = icon as any;
                        return <th key={id} className="px-4 py-4 font-semibold text-[13px] uppercase tracking-[0.04em] text-center"><Comp className="w-4 h-4 mx-auto" /></th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_LISTINGS.map(l => (
                      <tr key={l.id} 
                          onClick={() => setActiveListing(l.id)}
                          className={`cursor-pointer border-b border-[var(--ns-border)] last:border-0 hover:bg-[var(--ns-bg-tertiary)] transition-colors duration-150 ${activeListing === l.id ? 'bg-[var(--ns-accent-subtle)] border-l-[3px] border-l-[var(--ns-accent)]' : 'border-l-[3px] border-l-transparent'}`}>
                        <td className="px-5 py-4 font-mono font-medium text-[14px]">${l.monthlyCost}</td>
                        <td className="px-5 py-4 text-[15px]">{l.address}</td>
                        {rankedPrefs.map(id => {
                          const rating = (l.ratings as any)[id];
                          const color = rating >= 4 ? 'bg-[var(--ns-success)]/10 text-[var(--ns-success)] border-[var(--ns-success)]/20' : rating === 3 ? 'bg-[var(--ns-warning)]/10 text-[var(--ns-warning)] border-[var(--ns-warning)]/20' : 'bg-[var(--ns-danger)]/10 text-[var(--ns-danger)] border-[var(--ns-danger)]/20';
                          return (
                            <td key={id} className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wide uppercase ${color}`}>
                                {rating >= 4 ? 'Great' : rating === 3 ? 'OK' : 'Far'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal / Dialog Box Map Section */}
          {activeListing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ns-border)] bg-gray-50/50">
                  <div>
                    <h3 className="text-xl font-display font-semibold text-[var(--ns-text-primary)]">Map View Enabled</h3>
                    <p className="text-[14px] text-[var(--ns-text-secondary)] mt-0.5">Showing details for <strong>{MOCK_LISTINGS.find(l => l.id === activeListing)?.address}</strong></p>
                  </div>
                  <button 
                    onClick={() => setActiveListing(null)}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Map Body */}
                <div className="flex-1 relative bg-[#E5E3DF] flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                  <div className="z-10 flex flex-col items-center p-8 bg-white/90 backdrop-blur-md rounded-2xl border border-[var(--ns-border)] text-center shadow-lg max-w-md">
                    <MapPin className="w-12 h-12 text-[var(--ns-accent)] mb-4" />
                    <h3 className="text-2xl font-display font-medium text-[var(--ns-text-primary)] mb-2">Interactive Map Area</h3>
                    <p className="text-[15px] text-[var(--ns-text-secondary)] leading-relaxed">This map view has been expanded into a dialog to give you more screen space to explore your surroundings.</p>
                    <div className="mt-6 flex gap-3 flex-wrap justify-center">
                      {rankedPrefs.map(id => (
                        <span key={id} className={`w-4 h-4 rounded-full bg-[var(--ns-pin-${id})] shadow-sm`} title={id}></span>
                      ))}
                    </div>
                    <div className="mt-8 p-3 bg-blue-50 text-blue-800 rounded-lg text-[13px] font-mono border border-blue-200">
                      MVP: Integrate @vis.gl/react-google-maps here
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          <div className="h-8"></div>
        </div>

        {/* Input Box Area */}
        <div className="p-5 border-t border-[var(--ns-border)] bg-white z-10">
          <div className="flex gap-2.5 mb-4 overflow-x-auto pb-2 hide-scrollbar">
            <button onClick={() => sendMessage("Find housing within 2 miles of campus")} className="whitespace-nowrap px-4 py-2 rounded-[20px] border border-[var(--ns-border)] bg-white text-[13px] font-medium text-[var(--ns-text-secondary)] hover:bg-[var(--ns-bg-secondary)] hover:text-[var(--ns-text-primary)] transition-colors shadow-sm">Find housing within 2 miles of campus</button>
            <button onClick={() => sendMessage("Show me places $1,500–$2,500/month")} className="whitespace-nowrap px-4 py-2 rounded-[20px] border border-[var(--ns-border)] bg-white text-[13px] font-medium text-[var(--ns-text-secondary)] hover:bg-[var(--ns-bg-secondary)] hover:text-[var(--ns-text-primary)] transition-colors shadow-sm">Show me places $1,500–$2,500/month</button>
          </div>
          <div className="flex gap-3">
             <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
               className="flex-1 px-4 py-3 h-[48px] bg-[var(--ns-bg-primary)] border border-[var(--ns-border)] rounded-xl focus:outline-none focus:border-[var(--ns-accent)] focus:ring-[3px] focus:ring-[var(--ns-accent-subtle)] transition-all text-[15px] disabled:opacity-50"
               placeholder="Ask NestScout..." disabled={isTyping || !schoolSelected || selectedPrefs.length < 3} />
             <button onClick={() => sendMessage(input)} disabled={isTyping || !input.trim()} className="w-[48px] h-[48px] shrink-0 bg-[var(--ns-accent)] disabled:bg-[#f3b5a9] text-white rounded-xl flex items-center justify-center hover:bg-[var(--ns-accent-hover)] transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed">
               <Send className="w-5 h-5 ml-0.5" />
             </button>
          </div>
        </div>
      </div>

    </div>
  );
}
