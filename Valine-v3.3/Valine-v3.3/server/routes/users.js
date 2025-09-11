import { Router } from 'express';
import { store, nextId } from '../db/store.js';
const r=Router();
// Follow or unfollow a user. Provide the current userId in the request body.
r.post('/:id/follow',(req,res)=>{
  const { userId } = req.body || {};
  const target = store.users.find(u=>u.id===req.params.id);
  const current = store.users.find(u=>u.id===userId);
  if(!target || !current) return res.status(404).json({error:'User not found'});
  target.followers = target.followers || [];
  current.following = current.following || [];
  const already = target.followers.includes(userId);
  if(already){
    target.followers = target.followers.filter(id=>id!==userId);
    current.following = current.following.filter(id=>id!==target.id);
    return res.json({followed:false});
  } else {
    target.followers.push(userId);
    current.following.push(target.id);
    // Add a notification for the target user
    store.notifications.push({ id: nextId('n'), userId: target.id, message: `${current.name||'Someone'} followed you`, createdAt: new Date().toISOString().slice(0,10) });
    return res.json({followed:true});
  }
});
export default r;
