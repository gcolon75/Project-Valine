import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getScript, requestAccess, listComments, postComment, likeScript } from '../services/api.js';
import CommentList from '../components/CommentList.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ScriptDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { push } = useToast();
  const [script, setScript] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    getScript(id).then(data => {
      setScript(data);
      if (data && data.likes) {
        setLiked(data.likes.includes(user?.id));
        setLikeCount(data.likes.length);
      }
    });
    listComments(id).then(setComments).catch(() => setComments([]));
  }, [id, user]);

  const addComment = async () => {
    if (!text || !user) return;
    const body = { userId: user.id, content: text };
    const c = await postComment(id, body);
    setComments(prev => [c, ...prev]);
    setText('');
    push('Comment posted');
  };

  const handleRequest = () => {
    if (!user) return;
    requestAccess(id, user.id).then(() => push('Request sent'));
  };

  const handleLike = () => {
    if (!user) return;
    likeScript(id, user.id).then(res => {
      setLiked(res.liked);
      setLikeCount(res.likes);
    });
  };

  if (!script) {
    return <div className='card'>Loading…</div>;
  }

  return (
    <div>
      <div className='card'>
        <h2>{script.title}</h2>
        <p>{script.summary}</p>
        <button className='btn primary' onClick={handleRequest}>Request Access</button>
        <button className='btn' onClick={handleLike}>{liked ? 'Unlike' : 'Like'} ({likeCount})</button>
      </div>
      <div className='card'>
        <h3>Comments</h3>
        <CommentList comments={comments} />
        <div className='grid2'>
          <input value={text} onChange={e => setText(e.target.value)} placeholder='Leave a comment' />
          <button className='btn primary' onClick={addComment}>Add</button>
        </div>
      </div>
    </div>
  );
}
