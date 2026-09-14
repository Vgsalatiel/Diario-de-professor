import type {
  Aluno,
  Avaliacao,
  ConfigCalculo,
  DataAula,
  Evento,
  MapaDeFrequencia,
  MapaDeNotas,
  Professora,
  Turma,
} from '../types'
import { chaveNota } from '../lib/media'
import { chavePresenca } from '../lib/frequencia'

export const professoraInicial: Professora = {
  id: 'p1',
  nome: 'Professora',
  email: 'professora@escola.com',
  senha: '123456',
  materia: 'Matemática',
  fotoUrl: '',
}

export const turmasIniciais: Turma[] = [
  { id: 't1', nome: '9º Ano A', serie: 'Ensino Fundamental II', anoLetivo: '2026', escola: 'Escola Estadual Pedro Álvares', sistemaPeriodo: 'bimestre', cor: '#4759a8', diasAula: [2, 4] },
  { id: 't2', nome: '9º Ano B', serie: 'Ensino Fundamental II', anoLetivo: '2026', escola: 'Escola Estadual Pedro Álvares', sistemaPeriodo: 'bimestre', cor: '#2f9e6b', diasAula: [1, 3, 5] },
  { id: 't3', nome: '1º Ano EM', serie: 'Ensino Médio', anoLetivo: '2026', escola: 'Colégio Santa Clara', sistemaPeriodo: 'semestre', cor: '#e8a33d', diasAula: [1, 2, 3, 4, 5] },
  { id: 't4', nome: '2º Ano EM', serie: 'Ensino Médio', anoLetivo: '2026', escola: 'Colégio Santa Clara', sistemaPeriodo: 'semestre', cor: '#b05ac0', diasAula: [1, 2, 3, 4, 5] },
]

export const alunosIniciais: Aluno[] = [
  { id: 'a1', turmaId: 't1', nome: 'João', email: 'joao@escola.com', telefonePais: '(11) 91234-5001', dataNascimento: '2011-03-12', situacao: 'ativo' },
  { id: 'a2', turmaId: 't1', nome: 'Ana', email: 'ana@escola.com', telefonePais: '(11) 91234-5002', dataNascimento: '2011-07-25', situacao: 'ativo' },
  { id: 'a3', turmaId: 't1', nome: 'Lucas', email: 'lucas@escola.com', telefonePais: '(11) 91234-5003', dataNascimento: '2010-11-02', situacao: 'ativo' },
  { id: 'a4', turmaId: 't1', nome: 'Beatriz', situacao: 'transferido' },
  { id: 'a5', turmaId: 't2', nome: 'Rafael', situacao: 'ativo' },
  { id: 'a6', turmaId: 't2', nome: 'Carla', situacao: 'inativo' },
  { id: 'a7', turmaId: 't3', nome: 'Mariana', situacao: 'ativo' },
]

export const avaliacoesIniciais: Avaliacao[] = [
  { id: 'av1', turmaId: 't1', nome: 'Prova 1', peso: 1, periodo: '1' },
  { id: 'av2', turmaId: 't1', nome: 'Trabalho', peso: 1, periodo: '1' },
  { id: 'av3', turmaId: 't1', nome: 'Prova 2', peso: 1, periodo: '2' },
  { id: 'av4', turmaId: 't2', nome: 'Prova 1', peso: 2, periodo: '1' },
  { id: 'av5', turmaId: 't2', nome: 'Trabalho', peso: 1, periodo: '1' },
  { id: 'av6', turmaId: 't3', nome: 'Prova 1', peso: 1, periodo: '1' },
]

// Notas do exemplo do PDF (João, Ana, Lucas)
export const notasIniciais: MapaDeNotas = {
  [chaveNota('a1', 'av1')]: 8.0,
  [chaveNota('a1', 'av2')]: 9.0,
  [chaveNota('a1', 'av3')]: 7.0,
  [chaveNota('a2', 'av1')]: 10.0,
  [chaveNota('a2', 'av2')]: 8.0,
  [chaveNota('a2', 'av3')]: 9.0,
  [chaveNota('a3', 'av1')]: 5.0,
  [chaveNota('a3', 'av2')]: 6.0,
  [chaveNota('a3', 'av3')]: 7.0,
}

export const datasAulaIniciais: DataAula[] = [
  { id: 'da1', turmaId: 't1', data: '2026-09-01', periodo: '1' },
  { id: 'da2', turmaId: 't1', data: '2026-09-03', periodo: '1' },
  { id: 'da3', turmaId: 't1', data: '2026-09-08', periodo: '1' },
]

export const frequenciaIniciais: MapaDeFrequencia = {
  [chavePresenca('a1', 'da1')]: true,
  [chavePresenca('a1', 'da2')]: true,
  [chavePresenca('a1', 'da3')]: false,
  [chavePresenca('a2', 'da1')]: true,
  [chavePresenca('a2', 'da2')]: true,
  [chavePresenca('a2', 'da3')]: true,
  [chavePresenca('a3', 'da1')]: false,
  [chavePresenca('a3', 'da2')]: true,
  [chavePresenca('a3', 'da3')]: true,
}

export const configsIniciais: ConfigCalculo[] = [
  { turmaId: 't1', modelo: 'simples', mediaAprovacao: 6.0 },
  { turmaId: 't2', modelo: 'ponderada', mediaAprovacao: 6.0 },
  { turmaId: 't3', modelo: 'simples', mediaAprovacao: 6.0 },
  { turmaId: 't4', modelo: 'simples', mediaAprovacao: 6.0 },
]

export const eventosIniciais: Evento[] = [
  {
    id: 'e1',
    titulo: 'Prova de Matemática',
    tipo: 'prova',
    data: '2026-09-15',
    hora: '10:00',
    turmaId: 't1',
    conteudo: 'Equações do 2º grau e funções.',
  },
  {
    id: 'e2',
    titulo: 'Entrega de trabalho',
    tipo: 'trabalho',
    data: '2026-09-18',
    turmaId: 't2',
    conteudo: 'Pesquisa sobre geometria no dia a dia.',
  },
  {
    id: 'e3',
    titulo: 'Reunião pedagógica',
    tipo: 'reuniao',
    data: '2026-09-20',
    hora: '14:00',
    conteudo: 'Fechamento do bimestre.',
  },
]
