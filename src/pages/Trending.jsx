import React, { useEffect, useState } from 'react';
import { listScripts } from '../services/api.js';
import { Card } from '../components/Card.jsx';
export default function Trending() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    listScripts().then(res => {
      const all = res.items || res;
      const sorted = [...all].sort((a,b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      setItems(sorted.slice(0, 10));
    });
  }, []);
  return (<div className="p-4 space-y-4"><h1 className="text-xl font-bold">Trending Scripts</h1>{items.map(item => (<Card key={item.id}><h2 className="font-semibold">{item.title}</h2><p>{item.summary}</p><p className="text-sm text-gray-500">Likes: {item.likes?.length || 0}</p></Card>))}</div>);
}
