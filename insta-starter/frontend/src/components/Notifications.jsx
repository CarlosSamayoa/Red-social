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
    <div style={{
      maxWidth:800, 
      margin:'0 auto', 
      fontFamily:'system-ui', 
      padding:16
    }}>
      <header style={{
        display:'flex', 
        alignItems:'center', 
        gap:12, 
        marginBottom:12,
        padding: '1rem',
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <h2 style={{margin:0, color: 'var(--text-primary)'}}>Notificaciones</h2>
        <span style={{color:'var(--text-secondary)'}}>{unread} sin leer</span>
        <span style={{marginLeft:'auto'}}>
          <button 
            onClick={markAll} 
            disabled={marking || unread===0}
            style={{
              padding: '0.5rem 1rem',
              background: marking || unread===0 ? 'var(--bg-tertiary)' : 'var(--gradient-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: marking || unread===0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {marking ? 'Marcando…' : 'Marcar todas como leídas'}
          </button>
        </span>
      </header>
      {!items.length ? (
        <p style={{
          textAlign: 'center',
          padding: '3rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          No tienes notificaciones aún.
        </p>
      ) : (
        <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:8}}>
          {items.map(n => (
            <li 
              key={n._id} 
              style={{
                padding:'12px 16px', 
                borderRadius:12, 
                background: n.is_read ? 'var(--bg-secondary)' : 'rgba(102, 126, 234, 0.1)', 
                border: `1px solid ${n.is_read ? 'var(--border-color)' : 'rgba(102, 126, 234, 0.3)'}`,
                transition: 'all 0.2s'
              }}
            >
              <div style={{fontSize:12, color:'var(--text-secondary)', marginBottom: '4px'}}>
                {new Date(n.created_at).toLocaleString()}
              </div>
              <div style={{color: 'var(--text-primary)'}}>
                <strong>{n.kind}</strong>: {KIND_LABEL[n.kind] || 'actividad'}.
                {n.entity==='post' && n.entity_id && <> Ver <Link to={`/p/${n.entity_id}`} style={{color: 'var(--primary)'}}>publicación</Link>.</>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
