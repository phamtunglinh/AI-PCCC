
export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  sources?: { title: string; uri: string }[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string; 
  fileData?: string; 
  mimeType: string;
  size: number;
}

export interface AppState {
  messages: Message[];
  knowledgeBase: KnowledgeItem[];
  isStreaming: boolean;
  currentInput: string;
}
