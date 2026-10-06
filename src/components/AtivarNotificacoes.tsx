import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import {
  ativarNotificacoes,
  desativarNotificacoes,
  ehIOS,
  obterEstadoNotificacoes,
  type EstadoNotificacoes,
} from '../lib/notificacoes'

const EXPLICACAO: Record<EstadoNotificacoes, string> = {
  carregando: '',
  ativo: 'Ativado neste aparelho. Todo dia às 7h você recebe o resumo das provas, trabalhos e reuniões do dia.',
  inativo: 'Receba às 7h um resumo das provas, trabalhos e reuniões do dia, mesmo com o app fechado.',
  'precisa-instalar':
    'No iPhone/iPad, as notificações só funcionam com o app instalado: no Safari, toque em Compartilhar → "Adicionar à Tela de Início" e abra o Diário pelo ícone.',
  bloqueado:
    'As notificações estão bloqueadas para o Diário. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço) e volte aqui.',
  'sem-suporte': import.meta.env.DEV
    ? 'No modo de desenvolvimento (npm run dev) não há service worker — teste as notificações no site publicado ou com npm run build && npm run preview.'
    : ehIOS()
    ? 'Atualize o iPhone/iPad para o iOS 16.4 ou mais novo para receber notificações.'
    : 'Este navegador não permite notificações. Use o Chrome, Edge ou Firefox.',
}

export function AtivarNotificacoes() {
  const { notificar } = useToast()
  const [estado, setEstado] = useState<EstadoNotificacoes>('carregando')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    obterEstadoNotificacoes().then(setEstado, () => setEstado('sem-suporte'))
  }, [])

  async function alternar() {
    setOcupado(true)
    try {
      const novo = estado === 'ativo' ? await desativarNotificacoes() : await ativarNotificacoes()
      setEstado(novo)
      if (novo === 'ativo') notificar('Notificações ativadas neste aparelho.')
      if (estado === 'ativo' && novo === 'inativo') notificar('Notificações desativadas neste aparelho.')
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Não foi possível alterar as notificações.')
    } finally {
      setOcupado(false)
    }
  }

  if (estado === 'carregando') return null

  const podeAlternar = estado === 'ativo' || estado === 'inativo'

  return (
    <>
      <h3 className="titulo-secao">Notificações da agenda</h3>
      <div className="notificacoes-linha">
        <p className={podeAlternar ? 'texto-suave' : 'alerta-info'}>{EXPLICACAO[estado]}</p>
        {podeAlternar && (
          <button
            className={estado === 'ativo' ? 'btn btn-fantasma' : 'btn btn-primario'}
            onClick={alternar}
            disabled={ocupado}
          >
            {ocupado ? 'Aguarde...' : estado === 'ativo' ? 'Desativar' : 'Ativar notificações'}
          </button>
        )}
      </div>
    </>
  )
}
