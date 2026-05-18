"use client";
import React, { useState, useEffect } from 'react';
import { Send, Download, Upload, Plus, Trash2, Copy, Check, ChevronDown, ChevronUp, Phone } from 'lucide-react';

// 1. DEFINIAMO LE INTERFACCE PER LE PROPS DELL'EDITOR SPOSTATO FUORI
interface Template {
  id: string;
  title: string;
  text: string;
}

interface EditorAreaProps {
  templateId: string;
  templates: Template[];
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  copied: boolean;
  selectedId: string;
  handleCopy: () => void;
  handleWhatsApp: () => void;
  updateActiveTemplateTitle: (id: string, title: string) => void;
  updateActiveTemplateText: (id: string, text: string) => void;
}

// 2. COMPONENTE EDITOR SPOSTATO FUORI (Risolve il problema del focus)
const EditorArea = ({
  templateId,
  templates,
  phoneNumber,
  setPhoneNumber,
  copied,
  selectedId,
  handleCopy,
  handleWhatsApp,
  updateActiveTemplateTitle,
  updateActiveTemplateText
}: EditorAreaProps) => {
  const currentTemplate = templates.find(t => t.id === templateId);
  if (!currentTemplate) return null;

  return (
    <div className="space-y-6 pt-4 md:pt-0">
      {/* TITOLO MESSAGGIO */}
      <div className="px-2 space-y-2">
        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Titolo Messaggio</label>
        <input 
          value={currentTemplate.title} 
          onChange={(e) => updateActiveTemplateTitle(templateId, e.target.value)}
          className="w-full p-2 bg-zinc-50 border-b-2 border-zinc-100 font-bold text-xl outline-none focus:border-zinc-900 transition-colors"
          placeholder="Inserisci titolo..."
        />
      </div>

      {/* BARRA AZIONI: COPIA, INPUT TELEFONO E WHATSAPP */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-2">
        {/* Tasto Copia */}
        <button 
          onClick={handleCopy}
          className={`text-sm flex flex-1 sm:flex-none items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all ${copied && selectedId === templateId ? 'bg-gray-500 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
        >
          {copied && selectedId === templateId ? <><Check size={14}/> Copiato!</> : <><Copy size={14}/> Copia testo</>}
        </button>

        {/* Input Numero di Telefono */}
        <div className="flex-1 flex items-center relative">
          <Phone size={14} className="absolute left-3 text-gray-400" />
          <input 
            type="text"
            placeholder="Num. Telefono (es. +39333...)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full pl-9 pr-2 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-medium outline-none focus:border-zinc-950 focus:bg-white transition-all"
          />
        </div>

        {/* Tasto WhatsApp */}
        <button 
          onClick={handleWhatsApp}
          className="text-sm flex flex-1 sm:flex-none items-center justify-center gap-2 p-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Send size={14}/> WhatsApp
        </button>
      </div>

      {/* EDITOR MESSAGGIO */}
      <div className="space-y-2">
        <div className="flex justify-between items-end px-2">
          <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest italic">Contenuto del messaggio</label>
        </div>
        <textarea 
          value={currentTemplate.text} 
          onChange={(e) => updateActiveTemplateText(templateId, e.target.value)}
          className="w-full p-6 md:p-8 bg-white border-2 border-zinc-200 rounded-lg text-md font-medium min-h-[200px] md:min-h-[250px] outline-none shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)] focus:border-zinc-900 transition-colors"
          placeholder="Scrivi qui il tuo template..."
        />
      </div>
    </div>
  );
};

// 3. COMPONENTE PRINCIPALE
export default function MioDottoreAssistant() {
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', title: 'Igiene', text: "Gentile [NOME], le ricordiamo l'appuntamento per l'igiene domani alle ore [ORA]. Porti con sé lo spazzolino." },
    { id: '2', title: 'Prima Visita', text: "Gentile [NOME], la aspettiamo per la prima visita alle ore [ORA]. Arrivi 15 min prima per l'anagrafica." },
    { id: '3', title: 'Chirurgia', text: "Gentile [NOME], promemoria intervento domani ore [ORA]. Ricordiamo il digiuno da 6 ore." }
  ]);

  const [selectedId, setSelectedId] = useState('1');
  const [patientName, setPatientName] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [showDataDialog, setShowDataDialog] = useState<'import' | 'export' | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const activeTemplate = templates.find(t => t.id === selectedId);
    if (activeTemplate) {
      let msg = activeTemplate.text
        .replace(/\[NOME\]/g, patientName || "[NOME]")
        .replace(/\[ORA\]/g, appointmentTime || "[ORA]");
      setCurrentMessage(msg);
    }
  }, [selectedId, templates, patientName, appointmentTime]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const encodedMessage = encodeURIComponent(currentMessage);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanNumber}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleExport = () => {
    setJsonInput(JSON.stringify(templates, null, 2));
    setShowDataDialog('export');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setTemplates(parsed);
      setShowDataDialog(null);
      setJsonInput("");
    } catch (e) { alert("JSON non valido!"); }
  };

  const addNewTemplate = () => {
    const newId = Date.now().toString();
    setTemplates([...templates, { id: newId, title: 'Nuovo Messaggio', text: 'Gentile [NOME]...' }]);
    setSelectedId(newId);
  };

  const updateActiveTemplateText = (id: string, newText: string) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const updateActiveTemplateTitle = (id: string, newTitle: string) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans md:overflow-hidden">
      {/* HEADER */}
      <header className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white gap-4 border-b border-gray-100 md:border-none">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Messaggi standard</h1>
          <p className="text-sm md:text-md text-gray-400 mb-2">Crea e usa i tuoi messaggi standard per i pazienti: non perdi tempo e non fai errori di battitura.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDataDialog('import')} className="flex items-center gap-1 text-[10px] font-bold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 uppercase"><Upload size={12}/> Carica</button>
            <button onClick={handleExport} className="flex items-center gap-1 text-[10px] font-bold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 uppercase"><Download size={12}/> Esporta</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-y-auto md:overflow-hidden flex-col md:flex-row">
        {/* SIDEBAR (Desktop) & ACCORDION SYSTEM (Mobile) */}
        <aside className="w-full md:w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-4 flex-1 md:overflow-y-auto space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 px-2">I tuoi modelli</p>
            
            {templates.map(t => {
              const isSelected = selectedId === t.id;
              return (
                <div key={t.id} className="border-b border-gray-100 md:border-none pb-2 md:pb-0">
                  <button 
                    onClick={() => setSelectedId(isSelected ? "" : t.id)}
                    className={`w-full text-left p-3 md:p-2 rounded-lg transition-all flex justify-between items-center group ${isSelected ? 'bg-zinc-900 text-white shadow-lg' : 'hover:bg-zinc-100 text-zinc-600'}`}
                  >
                    <span className="truncate pr-2">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="md:hidden text-gray-400">
                        {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                      <Trash2 
                        size={14} 
                        className={`hover:text-red-400 transition-colors ${isSelected ? 'text-gray-400' : 'text-gray-300 md:opacity-0 group-hover:opacity-100'}`} 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const remaining = templates.filter(x => x.id !== t.id);
                          setTemplates(remaining);
                          if (isSelected) setSelectedId(remaining[0]?.id || "");
                        }}
                      />
                    </div>
                  </button>

                  {/* Contenuto Fisarmonica (Mobile) */}
                  <div className={`md:hidden transition-all duration-200 overflow-hidden ${isSelected ? 'max-h-[1200px] opacity-100 my-2' : 'max-h-0 opacity-0'}`}>
                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                      <EditorArea 
                        templateId={t.id}
                        templates={templates}
                        phoneNumber={phoneNumber}
                        setPhoneNumber={setPhoneNumber}
                        copied={copied}
                        selectedId={selectedId}
                        handleCopy={handleCopy}
                        handleWhatsApp={handleWhatsApp}
                        updateActiveTemplateTitle={updateActiveTemplateTitle}
                        updateActiveTemplateText={updateActiveTemplateText}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button onClick={addNewTemplate} className="w-full p-3 md:p-2 rounded-lg border-2 border-dashed border-zinc-200 text-zinc-400 flex items-center justify-center gap-2 hover:border-zinc-900 hover:text-zinc-900 transition-all mt-2">
              <Plus size={18}/> aggiungi
            </button>
          </div>
        </aside>

        {/* MAIN AREA - DESKTOP */}
        <main className="hidden md:block flex-1 overflow-y-auto p-6 md:p-2">
          <div className="max-w-3xl mx-auto">
            <EditorArea 
              templateId={selectedId}
              templates={templates}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              copied={copied}
              selectedId={selectedId}
              handleCopy={handleCopy}
              handleWhatsApp={handleWhatsApp}
              updateActiveTemplateTitle={updateActiveTemplateTitle}
              updateActiveTemplateText={updateActiveTemplateText}
            />
          </div>
        </main>
      </div>

      {/* MODAL IMPORT/EXPORT */}
      {showDataDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-6 md:p-8 rounded-lg space-y-6 shadow-2xl">
            <div>
              <h3 className="text-xl font-black tracking-tight">{showDataDialog === 'import' ? 'Carica Lista' : 'Esporta Lista'}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Copia e salva questo codice JSON in un file di testo per ripristinare i messaggi.</p>
            </div>
            <textarea 
              autoFocus
              className="w-full h-48 p-4 bg-gray-50 rounded-lg font-mono text-xs border-none outline-none focus:ring-2 focus:ring-zinc-900"
              value={jsonInput || (showDataDialog === 'export' ? JSON.stringify(templates, null, 2) : "")}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDataDialog(null); setJsonInput(""); }} className="text-md flex-1 py-3 text-gray-400 border border-gray-100 rounded-lg font-bold">Chiudi</button>
              {showDataDialog === 'import' && <button onClick={handleImport} className="text-md flex-1 py-3 bg-zinc-900 text-white rounded-lg shadow-lg font-bold">Carica dati</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}