import { Router } from 'express';import { store,nextId } from '../db/store.js';import { paginate } from './helpers.js';const r=Router();r.get('/',(req,res)=>{const page=Number(req.query.page||0);res.json(paginate(store.scripts,page,10));});r.get('/:id',(req,res)=>{const s=store.scripts.find(x=>x.id===req.params.id);if(!s) return res.status(404).json({error:'Not found'});res.json(s);});r.post('/',(req,res)=>{const { title, summary, isPrivate=true, authorId='u1' }=req.body||{};const item={id:nextId('s'),title,summary,isPrivate,authorId};store.scripts.unshift(item);res.json(item);});export default r;

r.post('/:id/like',(req,res)=>{
  const { userId } = req.body || {};
  const script = store.scripts.find(x=>x.id===req.params.id);
  if(!script) return res.status(404).json({error:'Not found'});
  script.likes = script.likes || [];
  const idx = script.likes.indexOf(userId);
  if(idx>=0){
    script.likes.splice(idx,1);
    return res.json({ liked: false, likes: script.likes.length });
  } else {
    script.likes.push(userId);
    // Notify the author if the liker is not the author
    if(script.authorId && script.authorId !== userId){
      store.notifications.push({ id: nextId('n'), userId: script.authorId, message: `Someone liked your script ${script.title}`, createdAt: new Date().toISOString().slice(0,10) });
    }
    return res.json({ liked: true, likes: script.likes.length });
  }
});
