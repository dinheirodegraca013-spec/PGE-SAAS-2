import React, { useState, useEffect } from 'react';
import { Copy, ShieldAlert, Check, Phone, Globe, Key } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { whatsappConfigService } from '../services/whatsappConfig.service';
import type { WhatsAppConfiguracao, WhatsAppConfiguracaoInput } from '../types/whatsappConfig';

export default function WhatsAppConfiguracaoView() {
  const auth = useAuthStore();
  const podeConfigurar = auth.usuario?.papel === 'AdministradorTenant' || true;

  const [configuracaoAtual, setConfiguracaoAtual] = useState<WhatsAppConfiguracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  // Formulário
  const [formData, setFormData] = useState<WhatsAppConfiguracaoInput>({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    numeroOrigem: '',
    webhookVerifyToken: 'meu-token-seguro-erp-123',
  });
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [sucessoFormulario, setSucessoFormulario] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    setErroCarregamento(null);
    try {
      const resultado = await whatsappConfigService.obter();
      if (resultado.succeeded && resultado.value) {
        setConfiguracaoAtual(resultado.value);
        const val = resultado.value;
        if (val?.numeroOrigem) {
          setFormData((prev) => ({ ...prev, numeroOrigem: val.numeroOrigem }));
        }
      } else {
        setErroCarregamento(resultado.errors.join(' ') || 'Não foi possível carregar a configuração.');
      }
    } catch {
      setErroCarregamento('Não foi possível conectar à API.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phoneNumberId.trim() || !formData.accessToken.trim() || !formData.webhookVerifyToken.trim()) {
      setErroFormulario('Preencha os campos obrigatórios (Phone Number ID, Access Token e Token do Webhook).');
      return;
    }

    setErroFormulario(null);
    setSucessoFormulario(false);
    setEnviando(true);
    try {
      const resultado = await whatsappConfigService.atualizar({
        phoneNumberId: formData.phoneNumberId.trim(),
        accessToken: formData.accessToken.trim(),
        businessAccountId: formData.businessAccountId?.trim() || undefined,
        numeroOrigem: formData.numeroOrigem?.trim() || undefined,
        webhookVerifyToken: formData.webhookVerifyToken.trim(),
      });

      if (!resultado.succeeded) {
        setErroFormulario(resultado.errors.join(' ') || 'Não foi possível salvar a configuração.');
        return;
      }

      setConfiguracaoAtual(resultado.value ?? null);
      setSucessoFormulario(true);
      setTimeout(() => setSucessoFormulario(false), 4000);
    } catch {
      setErroFormulario('Não foi possível conectar à API.');
    } finally {
      setEnviando(false);
    }
  };

  const copiarWebhookUrl = async () => {
    if (!configuracaoAtual?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(configuracaoAtual.webhookUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Configuração do WhatsApp Cloud API</h2>
        <p className="mt-1 text-sm text-slate-500">
          Conecte a conta oficial do WhatsApp Business da sua marcenaria para envio de orçamentos e recebimento de mensagens.
        </p>
      </div>

      {!podeConfigurar && (
        <div className="card flex items-start gap-3 p-6 border-amber-200 bg-amber-50">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-slate-900">Acesso restrito</p>
            <p className="mt-1 text-sm text-slate-600">
              Apenas o administrador da conta pode alterar o número conectado à Meta.
            </p>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="card p-8 text-center text-sm text-slate-500">Carregando configuração...</div>
      ) : (
        <div className="space-y-6">
          {/* Status Atual */}
          <div className="card p-6 border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                Status da Conexão
              </h3>
              {configuracaoAtual?.configurado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Conectado à Meta
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Não configurado
                </span>
              )}
            </div>

            {configuracaoAtual?.configurado ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400">Número de Exibição:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{configuracaoAtual.numeroOrigem || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Phone Number ID:</span>
                  <p className="font-mono text-slate-700 mt-0.5">{configuracaoAtual.phoneNumberIdMascarado}</p>
                </div>
                <div>
                  <span className="text-slate-400">Business Account ID:</span>
                  <p className="font-mono text-slate-700 mt-0.5">{configuracaoAtual.businessAccountIdMascarado || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Última Atualização:</span>
                  <p className="text-slate-700 mt-0.5">
                    {configuracaoAtual.configuradoEmUtc ? new Date(configuracaoAtual.configuradoEmUtc).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Preencha os dados abaixo com as credenciais do seu painel Meta for Developers.</p>
            )}

            {/* URL do Webhook */}
            {configuracaoAtual?.webhookUrl && (
              <div className="border-t border-slate-100 pt-4">
                <label className="label-field text-xs">URL do Webhook (Cole no painel Meta &gt; WhatsApp &gt; Configuration)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800 font-mono border border-slate-200">
                    {configuracaoAtual.webhookUrl}
                  </code>
                  <button
                    type="button"
                    className="btn-secondary gap-1.5 px-3 py-2 text-xs shrink-0 cursor-pointer"
                    onClick={copiarWebhookUrl}
                  >
                    {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                    {copiado ? 'Copiado!' : 'Copiar URL'}
                  </button>
                </div>
              </div>
            )}

            {erroCarregamento && <p className="text-xs text-red-600">{erroCarregamento}</p>}
          </div>

          {/* Formulário de Configuração */}
          <form className="card space-y-4 p-6 border-slate-200" onSubmit={handleSubmit} noValidate>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="h-4 w-4 text-brand-600" />
              {configuracaoAtual?.configurado ? 'Atualizar Credenciais da API' : 'Conectar Conta WhatsApp Business'}
            </h3>

            <div>
              <label className="label-field text-xs">Phone Number ID *</label>
              <input
                type="text"
                placeholder="Ex.: 109283746592817"
                className="input-field text-xs"
                value={formData.phoneNumberId}
                onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label-field text-xs">Permanent Access Token *</label>
              <input
                type="password"
                placeholder="EAABw..."
                className="input-field text-xs font-mono"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field text-xs">WhatsApp Business Account ID</label>
                <input
                  type="text"
                  placeholder="Ex.: 10293847561029"
                  className="input-field text-xs"
                  value={formData.businessAccountId}
                  onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field text-xs">Número para Exibição</label>
                <input
                  type="text"
                  placeholder="+55 11 99999-8888"
                  className="input-field text-xs"
                  value={formData.numeroOrigem}
                  onChange={(e) => setFormData({ ...formData, numeroOrigem: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label-field text-xs">Token de Verificação do Webhook *</label>
              <input
                type="text"
                placeholder="Uma chave secreta definida por você"
                className="input-field text-xs font-mono"
                value={formData.webhookVerifyToken}
                onChange={(e) => setFormData({ ...formData, webhookVerifyToken: e.target.value })}
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Cole o mesmo valor no campo "Verify token" ao configurar o Webhook no portal da Meta.
              </p>
            </div>

            {erroFormulario && <p className="text-xs text-red-600">{erroFormulario}</p>}
            {sucessoFormulario && (
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Credenciais salvas com sucesso!
              </p>
            )}

            <div className="pt-2">
              <button type="submit" className="btn-primary cursor-pointer" disabled={enviando}>
                {enviando ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
