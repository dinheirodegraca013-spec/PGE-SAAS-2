import {supabase} from '@/lib/supabase';
export type AcceptanceInput={request:string;clientName:string;proof:string;confirmed:boolean;notes:string};
export const installation={
  async accept(service:string,version:number,input:AcceptanceInput):Promise<void>{
    if(typeof service!=='string'||!service.trim()||!Number.isSafeInteger(version)||version<1)throw new Error('A instalação ou versão é inválida.');
    const {data,error}=await supabase.rpc('instalacao_registrar_aceite',{p_requisicao:input.request,p_servico:service,p_cliente_nome:input.clientName,p_comprovante:input.proof,p_confirmacao:input.confirmed,p_versao:version,p_observacoes:input.notes});
    if(error || !data)throw new Error(error?.code==='40001'?'A ficha foi alterada. Recarregue antes de registrar o aceite.':error?.message||'Não foi possível registrar o aceite.');
  },
};

