import React, { useEffect, useState } from 'react';
import { getJSON, postJSON } from '../api';
import { Link } from 'react-router-dom';

const KIND_LABEL = {
  follow: 'te comenzó a seguir',
  like: 'le gustó tu publicación',
  comment: 'comentó tu publicación',
  mention: 'te mencionó',
  message: 'te envió un mensaje'
};

export default function Notifications(){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const load = async ()=>{
    setLoading(true);
    try{
      const j = await getJSON('/notifications');
      setItems(j.notifications || []);
    }catch(e){ setError('No se pudieron cargar las notificaciones'); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const markAll = async ()=>{
    setMarking(true);
    try{ await postJSON('/notifications/read', {}); await load(); } finally { setMarking(false); }
  };

  if (loading) return <p>Cargando…</p>;
  if (error) return <p style={{color:'crimson'}}>{error}</p>;

  const unread = items.filter(n=>!n.is_read).length;

  return (
    <div style={{maxWidth:800, margin:'0 auto', fontFamily:'system-ui', padding:16}}>
      <header style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
        <h2 style={{margin:0}}>Notificaciones</h2>
        <span style={{color:'#666'}}>{unread} sin leer</span>
        <span style={{marginLeft:'auto'}}>
          <button onClick={markAll} disabled={marking || unread===0}>{marking ? 'Marcando…' : 'Marcar todas como leídas'}</button>
        </span>
      </header>
      {!items.length ? <p>No tienes notificaciones aún.</p> : (
        <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:8}}>
          {items.map(n => (
            <li key={n._id} style={{padding:'10px 12px', borderRadius:8, background:n.is_read?'#f6f7f8':'#eaf3ff', border:'1px solid #e3e7ee'}}>
              <div style={{fontSize:12, color:'#666'}}>{new Date(n.created_at).toLocaleString()}</div>
              <div>
                <strong>{n.kind}</strong>: {KIND_LABEL[n.kind] || 'actividad'}.
                {n.entity==='post' && n.entity_id && <> Ver <Link to={`/p/${n.entity_id}`}>publicación</Link>.</>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
