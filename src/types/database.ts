export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, {
      Row: Record<string, any>;
      Insert: Record<string, any>;
      Update: Record<string, any>;
    }>;
    Views: Record<string, never>;
    Functions: Record<string, {
      Args: Record<string, any>;
      Returns: any;
    }>;
    Enums: Record<string, never>;
  };
}
