import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseTokensFromHash } from '@/services/auth/cognito';

export default function AuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    parseTokensFromHash();
    nav('/feed', { replace: true });
  }, [nav]);
  return <div style={{ padding: 24 }}>Signing you in…</div>;
}
