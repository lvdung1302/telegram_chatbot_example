declare module 'chromadb' {
  export type Where = Record<string, string | number | boolean>;
  export interface Collection {
    name: string;
    add: (params: {
      ids: string[];
      embeddings: number[][];
      metadatas?: object[];
      documents?: string[];
    }) => Promise<void>;
    query: (params: {
      queryEmbeddings: number[][];
      nResults: number;
      where?: Where;
    }) => Promise<{
      ids: string[][];
      distances: number[][];
      documents: string[][];
    }>;
  }

  export class ChromaClient {
    constructor(config?: { path?: string; host?: string; port?: number });

    getOrCreateCollection(name: string): Promise<Collection>;
    getCollection(name: string): Promise<Collection>;
    createCollection(name: string): Promise<Collection>;
    listCollections(): Promise<{ name: string }[]>;
  }
}