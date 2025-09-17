import { useAuth } from '../context/AuthContext';

/**
 * Example role-gate. Wrap a block of UI or route element:
 * <RoleGate allow={['artist']}><NewScriptForm/></RoleGate>
 */
export default function RoleGate({ allow = [], children }) {
  const { user } = useAuth();
  if (!user) return null;
  if (allow.length && !allow.includes(user.role)) {
    return (
      <div className="card" style={{borderColor: '#f59e0b'}}>
        <b>Restricted</b>
        <p style={{marginBottom: 0}}>This action is limited to: {allow.join(', ')}.</p>
      </div>
    );
  }
  return children;
}
