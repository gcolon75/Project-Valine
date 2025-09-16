import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';

export default function Auditions(){
  const {items, sentinel} = useInfiniteList((p)=>api.listAuditions(p), []);
  return (
    <div>
      <h2 className="section-title">Auditions</h2>
      {items.map((a)=>(
        <div key={a.id} className="feed-card">
          <a href={'/auditions/'+a.id} style={{fontWeight:700}}>{a.title}</a>
          <p style={{margin:'6px 0 0 0'}}>{a.summary}</p>
          <div style={{marginTop:10}}><a className="btn primary" href={'/auditions/'+a.id}>View & Apply</a></div>
        </div>
      ))}
      <div ref={sentinel} style={{height:1}}/>
    </div>
  );
}
