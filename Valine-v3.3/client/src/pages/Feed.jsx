import useInfiniteList from '../hooks/useInfiniteList';
import * as api from '../services/api';

export default function Feed(){
  const {items, sentinel} = useInfiniteList((p)=>api.feed(p), []);
  return (
    <div>
      <h2 className="section-title">Feed</h2>
      {items.map((it, i)=>(
        <div key={i} className="feed-card">
          <h3>{it.title}</h3>
          <p>{it.summary}</p>
          <div className="kind">{it.kind}</div>
        </div>
      ))}
      <div ref={sentinel} style={{height:1}}/>
    </div>
  );
}
