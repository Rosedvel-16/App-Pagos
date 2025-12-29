import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from "firebase/firestore";
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, ChevronLeft, Trash2, Edit2, X, Share2, Lock } from 'lucide-react';

// --- COMPONENTE DE ACCESO (PIN) ---
const Login = ({ onAuth }) => {
  const [pin, setPin] = useState('');
  const PIN_CORRECTO = "1010";

  const handleInput = (e) => {
    const val = e.target.value;
    setPin(val);
    if (val === PIN_CORRECTO) onAuth(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
      <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl w-full max-w-sm text-center">
        <div className="bg-[#474BF0]/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="text-[#474BF0]" size={40} />
        </div>
        <h2 className="text-2xl font-black mb-2 uppercase tracking-widest">Privado</h2>
        <p className="text-white/40 text-xs font-bold mb-8 uppercase tracking-widest">Introduce el PIN de acceso</p>
        <input 
          type="password" 
          maxLength="4"
          value={pin}
          onChange={handleInput}
          className="w-full bg-black/40 border border-white/10 p-5 rounded-3xl text-center text-4xl tracking-[0.5em] outline-none focus:border-[#474BF0] transition-all"
          autoFocus
        />
      </div>
    </div>
  );
};

// --- COMPONENTE DE DETALLE (Reutilizable para Admin y Compartir) ---
const DetalleDeuda = ({ deudas, readonly }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const deuda = deudas.find(d => d.id === id);

  // Estados para Modal Abono
  const [modalAbono, setModalAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState(new Date().toISOString().split('T')[0]);
  const [metodoAbono, setMetodoAbono] = useState('Efectivo');
  const [editandoPagoId, setEditandoPagoId] = useState(null);

  if (!deuda) return <div className="p-10 text-white">Cargando o deuda no encontrada...</div>;

  const totalPagado = deuda.pagos?.reduce((acc, p) => acc + p.monto, 0) || 0;
  const falta = deuda.montoTotal - totalPagado;
  const porcentaje = Math.round((totalPagado / deuda.montoTotal) * 100) || 0;

  const guardarAbono = async () => {
    const deudaRef = doc(db, "deudas", id);
    let nuevosPagos = editandoPagoId 
      ? deuda.pagos.map(p => p.id === editandoPagoId ? { ...p, monto: parseFloat(montoAbono), fecha: fechaAbono, metodo: metodoAbono } : p)
      : [{ id: Date.now(), fecha: fechaAbono, monto: parseFloat(montoAbono), metodo: metodoAbono }, ...(deuda.pagos || [])];

    await updateDoc(deudaRef, { pagos: nuevosPagos });
    setModalAbono(false);
    setEditandoPagoId(null);
    setMontoAbono('');
  };

  const eliminarAbono = async (pagoId) => {
    if(window.confirm('¿Borrar abono?')) {
      const deudaRef = doc(db, "deudas", id);
      await updateDoc(deudaRef, { pagos: deuda.pagos.filter(p => p.id !== pagoId) });
    }
  };

  const copiarLink = () => {
  const link = `${window.location.origin}/compartir/${id}`;
  
  navigator.clipboard.writeText(link).then(() => {
    alert("✅ Enlace de vista copiado. Ya puedes pegarlo en WhatsApp.");
  }).catch(err => {
    console.error('Error al copiar: ', err);
    alert("Enlace: " + link);
  });
};

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-8 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/70 font-bold uppercase text-xs tracking-widest">
            <ChevronLeft size={20} /> {readonly ? 'App Deudas' : 'Volver'}
          </button>
          {!readonly && (
            <div className="flex gap-4">
              <button onClick={copiarLink} className="text-blue-400 p-2 bg-white/5 rounded-full"><Share2 size={20} /></button>
              <button onClick={async () => { if(confirm('¿Eliminar todo?')) { await deleteDoc(doc(db, "deudas", id)); navigate('/'); } }} className="text-red-400 p-2 bg-white/5 rounded-full"><Trash2 size={20} /></button>
            </div>
          )}
        </div>

        {/* Card de Progreso Circular */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-10 shadow-2xl flex flex-col md:flex-row items-center justify-around gap-10 mb-8 border border-white/20">
          <div className="relative flex items-center justify-center">
            <svg className="w-56 h-56 transform -rotate-90">
              <circle cx="50%" cy="50%" r="45%" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
              <circle cx="50%" cy="50%" r="45%" stroke="#474BF0" strokeWidth="12" fill="transparent" strokeDasharray={`${porcentaje * 2.82} 282`} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <span className="absolute text-4xl font-black text-[#474BF0]">{porcentaje}%</span>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">{deuda.nombre}</h2>
            <div className="space-y-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Te falta pagar</p>
               <p className="text-4xl font-bold text-slate-800 font-mono">S/ {falta.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {!readonly && (
          <button onClick={() => setModalAbono(true)} className="w-full md:w-64 py-5 rounded-2xl font-black text-white shadow-xl mb-8 transition-transform active:scale-95 uppercase tracking-widest text-xs" style={{backgroundColor: '#474BF0'}}>
            <Plus className="inline mr-2" size={20} /> Agregar Abono
          </button>
        )}

        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl border border-white/20">
          <h3 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Historial de Pagos</h3>
          <div className="space-y-6">
            {deuda.pagos?.map(pago => (
              <div key={pago.id} className="flex items-center justify-between border-b border-slate-50 pb-6 group">
                <div className="flex items-center gap-5">
                  <div className={`w-1.5 h-12 rounded-full ${pago.metodo === 'Yape' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-700 font-mono">S/ {pago.monto.toFixed(2)}</span>
                      <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${pago.metodo === 'Yape' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>{pago.metodo}</span>
                    </div>
                    <p className="text-sm text-slate-400 font-bold">{pago.fecha}</p>
                  </div>
                </div>
                {!readonly && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditandoPagoId(pago.id); setMontoAbono(pago.monto); setModalAbono(true); }} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={18} /></button>
                    <button onClick={() => eliminarAbono(pago.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-6 flex justify-between items-center">
              <span className="font-black text-slate-400 uppercase text-xs">Total Abonado</span>
              <span className="text-3xl font-black font-mono text-[#474BF0]">S/ {totalPagado.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Abono */}
      {modalAbono && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Registrar Pago</h2>
                <button onClick={() => setModalAbono(false)} className="text-slate-400 hover:rotate-90 transition-transform"><X size={28} /></button>
             </div>
             <div className="space-y-6">
                <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} placeholder="S/ 0.00" className="w-full bg-slate-50 p-5 rounded-3xl outline-none border border-slate-100 font-bold text-2xl text-center focus:border-[#474BF0]" />
                <div className="grid grid-cols-3 gap-2">
                  {['Yape', 'Efectivo', 'Otros'].map(m => (
                    <button key={m} onClick={() => setMetodoAbono(m)} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest ${metodoAbono === m ? 'bg-[#474BF0] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{m}</button>
                  ))}
                </div>
                <button onClick={guardarAbono} className="w-full bg-[#474BF0] text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform">Guardar Pago</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE HOME (LISTADO) ---
const Home = ({ deudas, setDeudaSeleccionada }) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const navigate = useNavigate();

  const agregarDeuda = async (e) => {
    e.preventDefault();
    if (!nombre || !monto) return;
    await addDoc(collection(db, "deudas"), { nombre, montoTotal: parseFloat(monto), pagos: [] });
    setNombre(''); setMonto(''); setMostrarForm(false);
  };

  return (
    <div className="min-h-screen w-full p-6 md:p-12 flex flex-col items-center animate-in slide-in-from-bottom duration-500">
      <div className="w-full max-w-xl">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none text-[#474BF0]">Deudas</h1>
            <p className="text-white/40 font-bold text-[10px] tracking-[0.3em] uppercase mt-2 italic">Cloud Database Online</p>
          </div>
          <button onClick={() => setMostrarForm(true)} className="bg-[#474BF0] text-white p-5 rounded-[2rem] shadow-2xl hover:scale-110 transition-transform"><Plus size={32} /></button>
        </header>

        <div className="space-y-6 mb-12">
          {deudas.map(deuda => {
            const totalPagado = deuda.pagos?.reduce((acc, p) => acc + p.monto, 0) || 0;
            const falta = deuda.montoTotal - totalPagado;
            const porcentaje = Math.round((totalPagado / deuda.montoTotal) * 100) || 0;
            return (
              <div key={deuda.id} onClick={() => navigate(`/deuda/${deuda.id}`)} className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl cursor-pointer hover:-translate-y-2 transition-all group border border-white/10">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-black text-slate-800 group-hover:text-[#474BF0] transition-colors uppercase tracking-tight">{deuda.nombre}</h3>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Faltan</p>
                    <p className="text-2xl font-bold font-mono text-[#474BF0]">S/ {falta.toFixed(2)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div className="h-full bg-[#474BF0] transition-all duration-1000" style={{ width: `${porcentaje}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {mostrarForm && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-white/20">
              <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase text-center tracking-widest">Nueva Deuda</h2>
              <form onSubmit={agregarDeuda} className="space-y-6">
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿NOMBRE DE LA DEUDA?" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-bold text-lg uppercase focus:border-[#474BF0] border border-slate-100" />
                <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="S/ CANTIDAD TOTAL" className="w-full p-6 bg-slate-50 rounded-3xl outline-none font-black text-2xl focus:border-[#474BF0] border border-slate-100" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 text-slate-400 font-black uppercase text-xs tracking-widest">Cerrar</button>
                  <button type="submit" className="flex-[2] bg-[#474BF0] text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl">Crear Ahora</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [deudas, setDeudas] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "deudas"), (snapshot) => {
      setDeudas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const fondoStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)), url('https://wallpaper.forfun.com/fetch/aa/aae0b5e796321474dbe7cb2aa5f23edb.jpeg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  return (
    <div style={fondoStyle} className="min-h-screen font-sans">
      <Routes>
        <Route path="/compartir/:id" element={<DetalleDeuda deudas={deudas} readonly={true} />} />
        <Route 
          path="*" 
          element={
            !isAuthenticated ? (
              <Login onAuth={setIsAuthenticated} />
            ) : (
              <Routes>
                <Route path="/" element={<Home deudas={deudas} />} />
                <Route path="/deuda/:id" element={<DetalleDeuda deudas={deudas} readonly={false} />} />
                {/* Redirección por si acaso escribe mal la URL */}
                <Route path="*" element={<Link to="/" className="text-white p-10 block text-center uppercase font-black">Página no encontrada - Volver al inicio</Link>} />
              </Routes>
            )
          } 
        />
      </Routes>
    </div>
  );
}