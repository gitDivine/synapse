export type PsychologicalTrait =
  | 'curious'
  | 'skeptical'
  | 'concessive'
  | 'devil_advocate'
  | 'enthusiastic'
  | 'analytical'
  | 'synthesizer'
  | 'provocateur';

export const ALL_TRAITS: PsychologicalTrait[] = [
  'curious',
  'skeptical',
  'concessive',
  'devil_advocate',
  'enthusiastic',
  'analytical',
  'synthesizer',
  'provocateur',
];

export interface PsychologicalState {
  agentId: string;
  current: PsychologicalTrait;
  history: PsychologicalTrait[];
  turnsInCurrentState: number;
}
