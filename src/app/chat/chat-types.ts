export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface ChatTurnRequest {
  readonly userName: string | null;
  readonly history: readonly ChatMessage[];
  readonly message: string;
}
