import { createContext,useContext,useState } from 'react';
import * as api from '../services/api';
const Ctx=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState({id:'u1',email:'artist@demo.com',role:'artist',name:'Demo Artist'});const login=async(e,p,r='artist')=>{const u=(await api.login({email:e,password:p,role:r})).user;setUser(u);return u};const logout=()=>setUser(null);return <Ctx.Provider value={{user,login,logout}}>{children}</Ctx.Provider>}export const useAuth=()=>useContext(Ctx);
