
import React, { useState } from 'react';
import { 
  PlusCircle, 
  Sparkles, 
  FileText, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Image as ImageIcon,
  PenTool,
  CheckCircle,
  Loader2,
  Download,
  Hash,
  RotateCcw,
  ArrowLeft,
  X
} from 'lucide-react';
import { 
  BidangType, 
  PeringkatType, 
  PencapaianType, 
  KategoriJawatan, 
  ReportData 
} from './types';
import { THEMES } from './constants';
import { generateObjectives, generateSummary } from './geminiService';
import SignaturePad from './SignaturePad';
import ReportTemplate from './ReportTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MAX_CHAR_COUNT = 500;

const SUB_KATEGORI_OPTIONS: Record<KategoriJawatan, string[]> = {
  [KategoriJawatan.PENGETUA]: ['Pentadbiran'],
  [KategoriJawatan.PENOLONG_KANAN]: ['Pentadbiran'],
  [KategoriJawatan.GKMP]: ['Sains Kemasyarakatan', 'Sains dan Matematik', 'Bahasa'],
  [KategoriJawatan.GURU]: ['Sains', 'Matematik', 'Bahasa Inggeris', 'Bahasa Melayu', 'Pendidikan Jasmani', 'Pendidikan Islam', 'Pendidikan Moral'],
  [KategoriJawatan.JURULATIH]: ['Seni Muzik', 'Seni Visual', 'Seni Teater', 'Seni Tari']
};

const INITIAL_STATE: ReportData = {
  bidang: BidangType.KURIKULUM,
  peringkat: PeringkatType.SEKOLAH,
  tajuk: '',
  lokasi: '',
  anjuran: '',
  isDateRange: false,
  tarikhMula: '',
  tarikhTamat: '',
  masaType: 'range',
  masaMula: '',
  masaTamat: '',
  objektif: '',
  impak: '',
  penglibatan: '',
  pencapaian: PencapaianType.TIDAK_BERKENAAN,
  pencapaianDetail: '',
  namaPenyedia: '',
  kategoriPenyedia: KategoriJawatan.GURU,
  subKategoriPenyedia: SUB_KATEGORI_OPTIONS[KategoriJawatan.GURU][0],
  signature: '',
  images: [],
  tahun: new Date().getFullYear().toString()
};

const App: React.FC = () => {
  const [formData, setFormData] = useState<ReportData>(INITIAL_STATE);
  const [loadingAI, setLoadingAI] = useState<{obj: boolean, impak: boolean}>({obj: false, impak: false});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const theme = THEMES[formData.bidang];
  const logoUrl = "https://lh3.googleusercontent.com/d/1tyJ5QLBbqarYBYAzkFmPJ7ZBZ0fYp97u";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'kategoriPenyedia') {
      const jawatan = value as KategoriJawatan;
      const options = SUB_KATEGORI_OPTIONS[jawatan];
      setFormData(prev => ({ 
        ...prev, 
        kategoriPenyedia: jawatan,
        subKategoriPenyedia: options[0] || ''
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleReset = () => {
    if (window.confirm("Adakah anda pasti untuk mengosongkan semua data dan memulakan pelaporan baharu?")) {
      setFormData(INITIAL_STATE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages = (Array.from(files) as File[]).slice(0, 4 - formData.images.length);
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, reader.result as string].slice(0, 4)
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const callAIObjectives = async () => {
    if (!formData.tajuk) return alert("Sila isi Tajuk Program dahulu!");
    setLoadingAI(prev => ({ ...prev, obj: true }));
    const result = await generateObjectives(formData.tajuk);
    setFormData(prev => ({ ...prev, objektif: result.slice(0, MAX_CHAR_COUNT) }));
    setLoadingAI(prev => ({ ...prev, obj: false }));
  };

  const callAISummary = async () => {
    if (!formData.tajuk) return alert("Sila isi Tajuk Program dahulu!");
    setLoadingAI(prev => ({ ...prev, impak: true }));
    const result = await generateSummary(formData.tajuk);
    setFormData(prev => ({ ...prev, impak: result.slice(0, MAX_CHAR_COUNT) }));
    setLoadingAI(prev => ({ ...prev, impak: false }));
  };

  const generatePDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    const element = document.getElementById('report-template-hidden');
    if (!element) {
        setIsGeneratingPDF(false);
        return;
    }
    try {
      await new Promise(r => setTimeout(r, 800));
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SSEMJ_OPR_${formData.tajuk.replace(/\s+/g, '_') || 'Laporan'}.pdf`);
    } catch (error) {
      console.error("PDF Ralat:", error);
      alert("Gagal menjana PDF. Sila cuba lagi.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20 bg-slate-50`}>
      <div className={`h-3 transition-all duration-500 ${theme.gradient} sticky top-0 z-50 shadow-md`}></div>
      <header className="bg-white shadow-sm border-b px-4 py-8 md:py-10 mb-6 md:mb-10 relative overflow-hidden flex flex-col items-center">
        <div className={`absolute inset-0 opacity-10 ${theme.gradient}`}></div>
        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-5">
          <div className="bg-white p-2 rounded-2xl shadow-xl border">
            <img src={logoUrl} alt="SSEMJ" className="h-16 md:h-24 w-auto" />
          </div>
          <div className="text-center px-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-gray-900 uppercase leading-none">
              SSEMJ <span className={`bg-clip-text text-transparent ${theme.gradient}`}>ONE PAGE REPORT</span>
            </h1>
            <p className="mt-2 md:mt-4 text-xs md:text-xl text-gray-700 font-black tracking-[0.2em] md:tracking-[0.4em] uppercase opacity-80">SISTEM PELAPORAN DIGITAL PANTAS DAN EFISIEN</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 md:p-14">
            <form className="space-y-10 md:space-y-14" onSubmit={(e) => e.preventDefault()}>
              <section className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <PlusCircle className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">1. Bidang & Peringkat</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-black">Bidang Pelaporan</label>
                    <select name="bidang" value={formData.bidang} onChange={handleInputChange} className={`w-full bg-gray-50 border-gray-200 rounded-xl shadow-sm focus:ring-4 focus:ring-opacity-20 ${theme.border} border-2 p-4 font-bold transition-all text-black uppercase`}>
                      <option value={BidangType.PENTADBIRAN}>PENTADBIRAN</option>
                      <option value={BidangType.HEM}>HEM</option>
                      <option value={BidangType.KURIKULUM}>KURIKULUM</option>
                      <option value={BidangType.KOKURIKULUM}>KOKURIKULUM</option>
                      <option value={BidangType.KESENIAN}>KESENIAN</option>
                    </select>
                  </div>
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-black">Peringkat Program</label>
                    <select name="peringkat" value={formData.peringkat} onChange={handleInputChange} className={`w-full bg-gray-50 border-gray-200 rounded-xl shadow-sm focus:ring-4 focus:ring-opacity-20 ${theme.border} border-2 p-4 font-bold transition-all text-black`}>
                      {Object.values(PeringkatType).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2 group-hover:text-black"><Hash className="w-4 h-4" /> Tahun</label>
                    <input type="text" name="tahun" value={formData.tahun} onChange={handleInputChange} placeholder="2026" className={`w-full bg-gray-50 border-gray-200 rounded-xl shadow-sm focus:ring-4 focus:ring-opacity-20 ${theme.border} border-2 p-4 font-bold text-black`} />
                  </div>
                </div>
              </section>

              <section className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <FileText className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">2. Maklumat Program</h2>
                </div>
                <div className="space-y-6 md:space-y-8">
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tajuk Program / Aktiviti</label>
                    <input type="text" name="tajuk" value={formData.tajuk} onChange={handleInputChange} placeholder="Tajuk program..." className={`w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 md:p-6 font-black text-lg uppercase focus:ring-4 focus:ring-opacity-20 ${theme.border} text-black placeholder:opacity-30`} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="group">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin className="w-5 h-5" /> Lokasi / Tempat</label>
                      <input type="text" name="lokasi" value={formData.lokasi} onChange={handleInputChange} placeholder="Lokasi..." className={`w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-bold uppercase focus:ring-4 focus:ring-opacity-20 ${theme.border} text-black`} />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Users className="w-5 h-5" /> Anjuran / Unit</label>
                      <input type="text" name="anjuran" value={formData.anjuran} onChange={handleInputChange} placeholder="Anjuran..." className={`w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-bold uppercase focus:ring-4 focus:ring-opacity-20 ${theme.border} text-black`} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <Calendar className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">3. Tarikh & Masa</h2>
                </div>
                <div className="bg-slate-50 p-6 rounded-[1.5rem] space-y-6 border-2 border-dashed border-gray-200">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <input type="checkbox" name="isDateRange" checked={formData.isDateRange} onChange={handleInputChange} className="w-6 h-6 rounded border-gray-300 cursor-pointer" />
                    <span className="text-base font-black text-gray-700 uppercase tracking-widest">Program Melebihi Sehari</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{formData.isDateRange ? 'Tarikh Mula' : 'Tarikh Program'}</label>
                      <input type="date" name="tarikhMula" value={formData.tarikhMula} onChange={handleInputChange} className="w-full bg-white border-gray-200 rounded-xl border-2 p-3 font-bold text-black" />
                    </div>
                    {formData.isDateRange && (
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tarikh Tamat</label>
                        <input type="date" name="tarikhTamat" value={formData.tarikhTamat} onChange={handleInputChange} className="w-full bg-white border-gray-200 rounded-xl border-2 p-3 font-bold text-black" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> Jenis Masa</label>
                      <select name="masaType" value={formData.masaType} onChange={handleInputChange} className="w-full bg-white border-gray-200 rounded-xl border-2 p-3 font-bold text-black">
                        <option value="range">Masa Spesifik</option>
                        <option value="sepanjang_hari">Sepanjang Hari</option>
                        <option value="sepanjang_program">Sepanjang Program</option>
                      </select>
                    </div>
                    {formData.masaType === 'range' && (
                      <div className="flex gap-4">
                        <input type="time" name="masaMula" value={formData.masaMula} onChange={handleInputChange} className="w-full bg-white border-gray-200 rounded-xl border-2 p-3 font-bold text-black" />
                        <input type="time" name="masaTamat" value={formData.masaTamat} onChange={handleInputChange} className="w-full bg-white border-gray-200 rounded-xl border-2 p-3 font-bold text-black" />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-8 md:space-y-10">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">4. Kandungan (AI)</h2>
                </div>
                <div className="space-y-10">
                  <div className="group">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Objektif Program</label>
                      <button type="button" onClick={callAIObjectives} disabled={loadingAI.obj} className={`flex items-center gap-3 text-xs px-6 py-3 rounded-full ${theme.gradient} text-white font-black shadow-lg disabled:opacity-50`}>
                        {loadingAI.obj ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} JANA IDEA AI
                      </button>
                    </div>
                    <textarea name="objektif" value={formData.objektif} onChange={handleInputChange} rows={5} maxLength={MAX_CHAR_COUNT} className="w-full bg-gray-50 border-gray-200 rounded-2xl border-2 p-6 font-medium text-black leading-relaxed" placeholder="Objektif program..."></textarea>
                  </div>
                  <div className="group">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Impak dan Rumusan</label>
                      <button type="button" onClick={callAISummary} disabled={loadingAI.impak} className={`flex items-center gap-3 text-xs px-6 py-3 rounded-full ${theme.gradient} text-white font-black shadow-lg disabled:opacity-50`}>
                        {loadingAI.impak ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} JANA IDEA AI
                      </button>
                    </div>
                    <textarea name="impak" value={formData.impak} onChange={handleInputChange} rows={5} maxLength={MAX_CHAR_COUNT} className="w-full bg-gray-50 border-gray-200 rounded-2xl border-2 p-6 font-medium text-black leading-relaxed" placeholder="Impak dan rumusan..."></textarea>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">5. Penglibatan</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="text" name="penglibatan" value={formData.penglibatan} onChange={handleInputChange} placeholder="Butiran penglibatan..." className={`w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-black uppercase text-black ${theme.border}`} />
                  <select name="pencapaian" value={formData.pencapaian} onChange={handleInputChange} className={`w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-bold text-black ${theme.border}`}>
                    {Object.values(PencapaianType).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <ImageIcon className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">6. Lampiran</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-[16/10] border-4 border-white shadow-md rounded-xl overflow-hidden group">
                      <img src={img} className="w-full h-full object-cover" alt="Activity" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {formData.images.length < 4 && (
                    <label className="aspect-[16/10] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                      <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3 md:gap-4 pb-3 border-b-2 border-gray-50">
                  <div className={`p-2 md:p-3 rounded-xl ${theme.gradient} text-white shadow-lg`}>
                    <PenTool className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">7. Tandatangan & Penyedia</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="group">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nama Penuh</label>
                      <input type="text" name="namaPenyedia" value={formData.namaPenyedia} onChange={handleInputChange} placeholder="Nama penuh..." className="w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-black uppercase text-black" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Jawatan</label>
                        <select name="kategoriPenyedia" value={formData.kategoriPenyedia} onChange={handleInputChange} className="w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-bold text-black">
                          {Object.values(KategoriJawatan).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Unit / Bidang</label>
                        <select name="subKategoriPenyedia" value={formData.subKategoriPenyedia} onChange={handleInputChange} className="w-full bg-gray-50 border-gray-200 rounded-xl border-2 p-4 font-bold text-black">
                          {SUB_KATEGORI_OPTIONS[formData.kategoriPenyedia].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <SignaturePad onSave={(dataUrl) => setFormData(prev => ({ ...prev, signature: dataUrl }))} initialValue={formData.signature} />
                </div>
              </section>
            </form>
          </div>

          <div className="bg-slate-50 px-6 py-8 flex flex-col md:flex-row gap-6 justify-between items-center border-t border-gray-100">
            <div className="flex gap-6">
              <button type="button" onClick={handleReset} className="text-red-500 font-black text-xs uppercase tracking-widest flex items-center gap-2"><RotateCcw className="w-5 h-5" /> ISI BARU</button>
              <button type="button" onClick={() => setShowPreview(true)} className="text-gray-500 font-black text-xs uppercase tracking-widest flex items-center gap-2"><FileText className="w-5 h-5" /> PREVIEW</button>
            </div>
            <button type="button" onClick={generatePDF} disabled={isGeneratingPDF} className={`px-10 py-5 ${theme.gradient} text-white font-black rounded-2xl shadow-xl flex items-center gap-4 disabled:opacity-70 uppercase tracking-widest`}>
              {isGeneratingPDF ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />} JANA PDF
            </button>
          </div>
        </div>
      </main>

      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-95 backdrop-blur-xl flex flex-col items-center">
          <div className="sticky top-0 w-full z-[70] bg-black bg-opacity-50 px-4 py-4 flex justify-between items-center">
            <button onClick={() => setShowPreview(false)} className="bg-white text-black p-2 rounded-full flex items-center gap-2 pr-4"><ArrowLeft className="w-5 h-5" /><span className="font-black text-xs uppercase">KEMBALI</span></button>
            <h3 className="text-white font-black text-xs uppercase tracking-widest">PREVIEW EKSKLUSIF</h3>
            <button onClick={() => setShowPreview(false)} className="text-white"><X className="w-8 h-8" /></button>
          </div>
          <div className="p-4 w-full flex flex-col items-center gap-12 pb-24">
            <div className="transform scale-[0.38] sm:scale-[0.6] md:scale-[0.8] lg:scale-[0.9] xl:scale-100 origin-top shadow-2xl rounded-lg">
              <ReportTemplate data={formData} id="report-template" />
            </div>
            <button onClick={() => setShowPreview(false)} className="bg-white text-black font-black px-10 py-6 rounded-full uppercase tracking-widest flex items-center gap-4"><RotateCcw className="w-6 h-6" /> TUTUP PREVIEW</button>
          </div>
        </div>
      )}

      <div className="fixed -left-[4000px] top-0 pointer-events-none">
        <ReportTemplate data={formData} id="report-template-hidden" />
      </div>

      <footer className="mt-12 text-center text-gray-400 font-black uppercase tracking-widest pb-10 text-[10px] opacity-50">
        <p>&copy; 2026 SSEMJ DIGITAL OPR SYSTEM | DEVELOPED BY DZURRI</p>
      </footer>
    </div>
  );
};

export default App;
