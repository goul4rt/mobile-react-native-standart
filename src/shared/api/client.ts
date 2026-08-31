import { Platform } from 'react-native';

/**
 * O emulador do Android não enxerga `localhost` da máquina: 10.0.2.2 é o alias
 * do host. No simulador do iOS, localhost é o host mesmo.
 */
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// ponytail: constante. Vira variável de ambiente quando houver mais de um
// ambiente (staging/prod) pra apontar.
export const API_URL = `http://${HOST}:3000`;

export type Media = { id: string; url: string; alt?: string };
export type RichContent = { format: 'markdown' | 'html'; body: string; media: Media[] };

export type Alternative = { id: string; content: RichContent; correct: boolean };

export type Question = {
  id: string;
  kind: 'mc_single';
  stem: RichContent;
  supports: RichContent[];
  explanation?: RichContent;
  alternatives: Alternative[];
  metadata: {
    year?: number;
    area?: 'LC' | 'CH' | 'CN' | 'MT';
    discipline?: string;
    tags: string[];
  };
};

export const AREA_LABEL: Record<string, string> = {
  LC: 'Linguagens',
  CH: 'Ciências Humanas',
  CN: 'Ciências da Natureza',
  MT: 'Matemática',
};

export type Resposta = {
  questionId: string;
  escolha: string;
  correta: boolean;
  tempoMs: number;
};

/**
 * Média da população na área. A API só devolve linha acima de 30 respostas —
 * abaixo disso a tela explica a ausência em vez de mostrar número frágil.
 */
export async function fetchPopulation(area: string): Promise<{ accuracy: number; users: number } | null> {
  const res = await fetch(`${API_URL}/v1/stats/population`);
  if (!res.ok) return null;
  const data = (await res.json()) as { byArea: { area: string; accuracy: number; users: number }[] };
  return data.byArea.find((a) => a.area === area) ?? null;
}

export async function fetchSession(area: string, limit = 10): Promise<Question[]> {
  const res = await fetch(`${API_URL}/v1/questions?area=${area}&random=true&limit=${limit}`);
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const data = (await res.json()) as { items: Question[] };
  return data.items;
}
