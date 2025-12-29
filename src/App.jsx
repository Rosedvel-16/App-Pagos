import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig'; // Importamos la base de datos
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { Plus, ChevronLeft, Trash2, Edit2, X } from 'lucide-react';

function App() {
  const [deudas, setDeudas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para formularios
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null);
  
  // Estados para Abonos
  const [modalAbono, setModalAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [fechaAbono, setFechaAbono] = useState(new Date().toISOString().split('T')[0]);
  const [metodoAbono, setMetodoAbono] = useState('Efectivo');
  const [editandoPagoId, setEditandoPagoId] = useState(null);

  // --- ESCUCHAR FIREBASE EN TIEMPO REAL ---
  useEffect(() => {
    const q = query(collection(db, "deudas"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDeudas(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- FUNCIONES DE DEUDA (FIREBASE) ---
  const agregarDeuda = async (e) => {
    e.preventDefault();
    if (!nombre || !monto) return;
    try {
      await addDoc(collection(db, "deudas"), {
        nombre,
        montoTotal: parseFloat(monto),
        pagos: []
      });
      setNombre(''); setMonto(''); setMostrarForm(false);
    } catch (error) {
      console.error("Error al agregar deuda:", error);
    }
  };

  const eliminarDeuda = async (id) => {
    if(window.confirm('¿Eliminar esta deuda permanentemente de la nube?')) {
      try {
        await deleteDoc(doc(db, "deudas", id));
        setDeudaSeleccionada(null);
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  // --- FUNCIONES DE ABONOS (FIREBASE) ---
  const guardarAbono = async () => {
    if (!montoAbono) return;
    const deudaActual = deudas.find(d => d.id === deudaSeleccionada);
    const deudaRef = doc(db, "deudas", deudaSeleccionada);

    let nuevosPagos;
    if (editandoPagoId) {
      nuevosPagos = deudaActual.pagos.map(p => 
        p.id === editandoPagoId ? { ...p, monto: parseFloat(montoAbono), fecha: fechaAbono, metodo: metodoAbono } : p
      );
    } else {
      const nuevoPago = { id: Date.now(), fecha: fechaAbono, monto: parseFloat(montoAbono), metodo: metodoAbono };
      nuevosPagos = [nuevoPago, ...deudaActual.pagos];
    }

    try {
      await updateDoc(deudaRef, { pagos: nuevosPagos });
      cerrarModalAbono();
    } catch (error) {
      console.error("Error al guardar abono:", error);
    }
  };

  const eliminarAbono = async (pagoId) => {
    if(window.confirm('¿Borrar este abono?')) {
      const deudaActual = deudas.find(d => d.id === deudaSeleccionada);
      const deudaRef = doc(db, "deudas", deudaSeleccionada);
      const pagosFiltrados = deudaActual.pagos.filter(p => p.id !== pagoId);
      
      try {
        await updateDoc(deudaRef, { pagos: pagosFiltrados });
      } catch (error) {
        console.error("Error al eliminar abono:", error);
      }
    }
  };

  // --- LÓGICA DE INTERFAZ ---
  const abrirModalEditar = (pago) => {
    setEditandoPagoId(pago.id);
    setMontoAbono(pago.monto);
    setFechaAbono(pago.fecha);
    setMetodoAbono(pago.metodo);
    setModalAbono(true);
  };

  const cerrarModalAbono = () => {
    setModalAbono(false);
    setEditandoPagoId(null);
    setMontoAbono('');
    setMetodoAbono('Efectivo');
  };

  const fondoStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.45)), url('https://wallpaper.forfun.com/fetch/aa/aae0b5e796321474dbe7cb2aa5f23edb.jpeg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">Cargando datos de papá...</div>;

  // --- VISTA DETALLE ---
  if (deudaSeleccionada) {
    const deuda = deudas.find(d => d.id === deudaSeleccionada);
    if (!deuda) return null;
    const totalPagado = deuda.pagos.reduce((acc, p) => acc + p.monto, 0);
    const falta = deuda.montoTotal - totalPagado;
    const porcentaje = Math.round((totalPagado / deuda.montoTotal) * 100) || 0;

    return (
      <div style={fondoStyle} className="min-h-screen w-full text-slate-800 flex flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setDeudaSeleccionada(null)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors font-medium">
              <ChevronLeft size={24} /> Volver
            </button>
            <button onClick={() => eliminarDeuda(deuda.id)} className="text-red-400 hover:text-red-500 transition-colors">
              <Trash2 size={24} />
            </button>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-around gap-8 mb-8">
            <div className="relative flex items-center justify-center">
              <svg className="w-48 h-48 md:w-64 md:h-64 transform -rotate-90">
                <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                <circle cx="50%" cy="50%" r="45%" stroke="#474BF0" strokeWidth="12" fill="transparent" 
                  strokeDasharray={`${porcentaje * 2.82} 282`} 
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <span className="absolute text-3xl md:text-4xl font-black" style={{color: '#474BF0'}}>{porcentaje}%</span>
            </div>
            
            <div className="space-y-6 text-center md:text-left">
              <h2 className="text-4xl font-bold text-slate-800">{deuda.nombre}</h2>
              <div className="grid grid-cols-1 gap-4 font-mono">
                <div><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Monto Inicial</p><p className="text-2xl text-slate-600">S/ {deuda.montoTotal.toFixed(2)}</p></div>
                <div><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Total Pagado</p><p className="text-2xl" style={{color: '#474BF0'}}>S/ {totalPagado.toFixed(2)}</p></div>
                <div><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Te Falta</p><p className="text-2xl text-slate-800">S/ {falta.toFixed(2)}</p></div>
              </div>
            </div>
          </div>

          <button onClick={() => setModalAbono(true)} className="w-full md:w-64 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl mb-8 transition-transform active:scale-95 text-white" style={{backgroundColor: '#474BF0'}}>
            <Plus size={24} /> Agregar Abono
          </button>

          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-400 mb-6 uppercase tracking-wider">Historial de Abonos</h3>
            <div className="space-y-6">
                {deuda.pagos.map(pago => (
                  <div key={pago.id} className="flex items-center justify-between border-b border-slate-50 pb-6 group">
                    <div className="flex items-center gap-4">
                      <div className={`w-1.5 h-12 rounded-full ${pago.metodo === 'Yape' ? 'bg-purple-500' : pago.metodo === 'Efectivo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-slate-700 font-mono">S/ {pago.monto.toFixed(2)}</span>
                          <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${pago.metodo === 'Yape' ? 'bg-purple-100 text-purple-600' : pago.metodo === 'Efectivo' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{pago.metodo}</span>
                        </div>
                        <p className="text-sm text-slate-400 font-medium">{pago.fecha}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirModalEditar(pago)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => eliminarAbono(pago.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Modal Abono */}
        {modalAbono && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-slate-800">{editandoPagoId ? 'Editar Abono' : 'Nuevo Abono'}</h2>
                <button onClick={cerrarModalAbono} className="text-slate-400"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-bold text-lg" placeholder="S/ 0.00" />
                <input type="date" value={fechaAbono} onChange={(e) => setFechaAbono(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none font-medium" />
                <div className="grid grid-cols-3 gap-2">
                  {['Yape', 'Efectivo', 'Otros'].map(m => (
                    <button key={m} onClick={() => setMetodoAbono(m)} className={`py-3 rounded-2xl font-bold text-xs ${metodoAbono === m ? (m === 'Yape' ? 'bg-purple-600 text-white' : m === 'Efectivo' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white') : 'bg-slate-50 text-slate-400'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <button onClick={guardarAbono} className="w-full text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl" style={{backgroundColor: '#474BF0'}}>
                  {editandoPagoId ? 'Guardar Cambios' : 'Registrar Abono'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA LISTA PRINCIPAL ---
  return (
    <div style={fondoStyle} className="min-h-screen w-full p-6 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <header className="mb-12 mt-8">
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2" style={{color: '#474BF0'}}>Control de Deudas</h1>
          <p className="text-white/60 font-bold text-xs tracking-widest uppercase">Base de datos en la nube activa</p>
        </header>

        <div className="grid grid-cols-1 gap-6 mb-12">
          {deudas.map(deuda => {
            const totalPagado = deuda.pagos?.reduce((acc, p) => acc + p.monto, 0) || 0;
            const falta = deuda.montoTotal - totalPagado;
            const porcentaje = Math.round((totalPagado / deuda.montoTotal) * 100) || 0;
            return (
              <div key={deuda.id} onClick={() => setDeudaSeleccionada(deuda.id)} className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl cursor-pointer hover:-translate-y-1 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-slate-800">{deuda.nombre}</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Te falta:</p>
                    <p className="text-xl font-bold font-mono" style={{color: '#474BF0'}}>S/ {falta.toFixed(2)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full mb-3 overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${porcentaje}%`, backgroundColor: '#474BF0' }} />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                  <span>{porcentaje}% pagado</span>
                  <span style={{color: '#474BF0'}}>NUBE ACTIVA</span>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => setMostrarForm(true)} className="w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 text-white transition-transform active:scale-95" style={{backgroundColor: '#474BF0'}}>
          <Plus size={28} /> Agregar Nueva Deuda
        </button>

        {mostrarForm && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase text-center tracking-widest">Nueva Cuenta</h2>
              <form onSubmit={agregarDeuda} className="space-y-6">
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿Qué deuda es?" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 font-bold" style={{'--tw-ring-color': '#474BF0'}} />
                <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="S/ Cantidad total" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 font-bold text-xl" style={{'--tw-ring-color': '#474BF0'}} />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-3xl font-bold uppercase text-xs">Cerrar</button>
                  <button type="submit" className="flex-[2] text-white py-5 rounded-3xl font-black uppercase text-xs" style={{backgroundColor: '#474BF0'}}>Crear</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;