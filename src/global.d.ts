interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'arrayBuffer' | 'json' }): Promise<string | ArrayBuffer | object | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: object): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: object): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}
