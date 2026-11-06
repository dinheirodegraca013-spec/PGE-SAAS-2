import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { workforceAccess } from '../services/access.service';
import type { WorkforceContext } from '../types/access';

type AccessState = { context: WorkforceContext | null; loading: boolean; error: string; reload: () => Promise<void> };
const Context = createContext<AccessState | null>(null);
export function WorkforceAccessProvider({children}:{children:React.ReactNode}) {
  const auth=useAuthStore();
  const [context,setContext]=useState<WorkforceContext|null>(null);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const userId=auth.usuario?.usuarioId;const tenantId=auth.usuario?.tenantId;
  const identity=useRef({userId,tenantId});identity.current={userId,tenantId};
  const generation=useRef(0);
  const reload=useCallback(async()=>{
    const request=++generation.current;
    const current=()=>request===generation.current&&identity.current.userId===userId&&identity.current.tenantId===tenantId;
    if(!userId||!tenantId){setContext(null);setError('');setLoading(false);return;}
    setLoading(true);
    try{
      const next=await workforceAccess.context();
      if(!current())return;
      if(next.empresa_id!==tenantId||next.funcionario.id!==userId)throw new Error('A sessão mudou. Entre novamente para validar as permissões.');
      setContext(next);setError('');
    }catch(e){if(current()){setContext(null);setError(e instanceof Error&&e.message?e.message:typeof e==='string'?e:'Não foi possível validar o acesso de trabalho.');}}
    finally{if(current())setLoading(false);}
  },[userId,tenantId]);
  useEffect(()=>{void reload();},[reload]);
  useEffect(()=>()=>{generation.current++;},[]);
  useEffect(()=>{
    if(!userId)return;
    const refresh=()=>{if(document.visibilityState==='visible')void reload();};
    const timer=window.setInterval(refresh,30000);
    document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[reload,userId]);
  const visible=context?.funcionario.id===userId&&context?.empresa_id===tenantId?context:null;
  return <Context.Provider value={{context:visible,loading:loading||Boolean(userId&&!visible&&!error),error,reload}}>{children}</Context.Provider>;
}
export function useWorkforceAccess():AccessState {
  const value=useContext(Context);
  if(!value)throw new Error('WorkforceAccessProvider não encontrado.');
  return value;
}

