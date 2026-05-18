"use client";
import React, { useState, useEffect } from 'react';
import { Send, Download, Upload, Plus, Trash2, Copy, Check, ChevronDown, ChevronUp, Phone } from 'lucide-react';

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

const EditorArea = ({
  templateId, templates, phoneNumber, setPhoneNumber, copied, selectedId,
  handleCopy, handleWhatsApp, updateActiveTemplateTitle, updateActiveTemplateText
}: EditorAreaProps) => {
  const currentTemplate = templates.find(t => t.id === templateId);
  if (!currentTemplate) return null;

  return (
    <div className="space-y-6 pt-4 md:pt-0">
      <div className="px-2 space-y-2">
        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Titolo Messaggio</label>
        <input
          value={currentTemplate.title}
          onChange={(e) => updateActiveTemplateTitle(templateId, e.target.value)}
          className="w-full p-2 bg-zinc-50 border-b-2 border-zinc-100 font-bold text-xl outline-none focus:border-zinc-900 transition-colors"
          placeholder="Inserisci titolo..."
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-2">
        <button
          onClick={handleCopy}
          className={`text-sm flex flex-1 sm:flex-none items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all ${copied && selectedId === templateId ? 'bg-gray-500 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
        >
          {copied && selectedId === templateId ? <><Check size={14} /> Copiato!</> : <><Copy size={14} /> Copia testo</>}
        </button>

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

        <button
          onClick={handleWhatsApp}
          className="text-sm flex flex-1 sm:flex-none items-center justify-center gap-2 p-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Send size={14} /> WhatsApp
        </button>
      </div>

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

export default function MioDottoreAssistant() {
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', title: 'Igiene', text: "Gentile [NOME], le ricordiamo l'appuntamento per l'igiene domani alle ore [ORA]. Porti con sé lo spazzolino." },
    { id: '2', title: 'Prima Visita', text: "Gentile [NOME], la aspettiamo per la prima visita alle ore [ORA]. Arrivi 15 min prima per l'anagrafica." },
    { id: '3', title: 'Chirurgia', text: "Gentile [NOME], promemoria intervento domani ore [ORA]. Ricordiamo il digiuno da 6 ore." }
  ]);

  const [selectedId, setSelectedId] = useState('1');
  const [patientName] = useState("");
  const [appointmentTime] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [showDataDialog, setShowDataDialog] = useState<'import' | 'export' | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const activeTemplate = templates.find(t => t.id === selectedId);
    if (activeTemplate) {
      const msg = activeTemplate.text
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
    window.open(`https://api.whatsapp.com/send/?phone=${cleanNumber}&text=${encodedMessage}`, '_blank');
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
    } catch { alert("JSON non valido!"); }
  };

  const addNewTemplate = () => {
    const newId = Date.now().toString();
    setTemplates([...templates, { id: newId, title: 'Nuovo Messaggio', text: 'Gentile [NOME]...' }]);
    setSelectedId(newId);
  };

  const updateActiveTemplateText = (id: string, newText: string) =>
    setTemplates(templates.map(t => t.id === id ? { ...t, text: newText } : t));

  const updateActiveTemplateTitle = (id: string, newTitle: string) =>
    setTemplates(templates.map(t => t.id === id ? { ...t, title: newTitle } : t));

  return (
    /* 
      FIX CHIAVE 1: "h-auto md:h-screen" e "overflow-y-auto md:overflow-hidden"
      Su mobile l'altezza è fluida, ma diciamo esplicitamente che se serve può scrollare.
      "touch-auto" assicura che i gesti del telefono (pan/scroll) non vengano intercettati male.
    */
    <div className="flex flex-col w-full h-auto md:h-screen bg-white text-black font-sans overflow-y-auto md:overflow-hidden touch-auto">

      {/* HEADER */}
      <header className="shrink-0 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white gap-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Messaggi standard</h1>
          <p className="text-sm text-gray-400 mb-2">Crea e usa i tuoi messaggi standard per i pazienti. Usa ESPORTA per salvare e CARICA per ripristinare.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDataDialog('import')} className="flex items-center gap-1 text-[10px] font-bold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 uppercase"><Upload size={12} /> Carica</button>
            <button onClick={handleExport} className="flex items-center gap-1 text-[10px] font-bold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 uppercase"><Download size={12} /> Esporta</button>
          </div>
        </div>
      </header>

      {/* BODY */}
      {/* FIX CHIAVE 2: Rimosso completamente h-full su mobile che causava blocchi collaterali */}
      <div className="flex flex-col flex-1 md:flex-row md:overflow-hidden">

        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-100 md:flex md:flex-col bg-gray-50/50">
          <div className="p-4 space-y-2 md:flex-1 md:overflow-y-auto">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 px-2">I tuoi modelli</p>

            {templates.map(t => {
              const isOpen = selectedId === t.id;
              return (
                <div key={t.id} className="block">
                  <button
                    onClick={() => setSelectedId(isOpen ? "" : t.id)}
                    className={`w-full text-left p-3 md:p-2 rounded-lg transition-all flex justify-between items-center group ${isOpen ? 'bg-zinc-900 text-white shadow-lg' : 'hover:bg-zinc-100 text-zinc-600'}`}
                  >
                    <span className="truncate pr-2">{t.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="md:hidden text-gray-400">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                      <Trash2
                        size={14}
                        className={`hover:text-red-400 transition-colors ${isOpen ? 'text-gray-400' : 'text-gray-300 md:opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const remaining = templates.filter(x => x.id !== t.id);
                          setTemplates(remaining);
                          if (isOpen) setSelectedId(remaining[0]?.id || "");
                        }}
                      />
                    </div>
                  </button>

                  {/* FIX CHIAVE 3: Aggiunto overscroll-contain per evitare conflitti di scroll nativi */}
                  <div className={`md:hidden mt-1 mb-3 overscroll-contain ${isOpen ? 'block' : 'hidden'}`}>
                    <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
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

            <button
              onClick={addNewTemplate}
              className="w-full p-3 md:p-2 rounded-lg border-2 border-dashed border-zinc-200 text-zinc-400 flex items-center justify-center gap-2 hover:border-zinc-900 hover:text-zinc-900 transition-all mt-2"
            >
              <Plus size={18} /> aggiungi
            </button>
          </div>
        </aside>

        {/* MAIN — solo desktop */}
        <main className="hidden md:block flex-1 overflow-y-auto p-8">
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

      {/* FOOTER */}
      <footer className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-1">
        <p className="text-[11px] text-gray-400 font-medium">Messaggi Standard · MioDottore Assistant</p>
        <p className="text-[11px] text-gray-300">I dati rimangono nel browser — nessun invio a server esterni.</p>
      </footer>

      {/* MODAL */}
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