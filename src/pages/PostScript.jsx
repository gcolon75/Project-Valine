import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
export default function PostScript(){ const [title,setTitle]=useState(''); const [summary,setSummary]=useState(''); const navigate=useNavigate(); const onSubmit = async ()=>{ try{ await api.createScript({ title, summary, isPrivate:true }); navigate('/feed'); }catch(e){ alert('Error creating script'); } }; return (<div><h3>Post Script</h3><input placeholder='title' value={title} onChange={e=>setTitle(e.target.value)} /><textarea placeholder='summary' value={summary} onChange={e=>setSummary(e.target.value)} rows='4'></textarea><div><button onClick={onSubmit}>Create</button></div></div>); }
