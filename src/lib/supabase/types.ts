// Placeholder — `npm run db:types` çalıştırılınca oluşan
// `types.generated.ts` ile değiştirilecek.
//
// İçerik `any` satırları içeriyor çünkü hedef:
//  (1) Supabase client'ı "bu kolon yok" diye şikayet etmesin,
//  (2) Migration'lar cloud'da uygulandıktan sonra gerçek tiplere geçilecek.

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: any;
        Insert: any;
        Update: any;
        Relationships: any[];
      };
    };
    Views: {
      [key: string]: { Row: any; Relationships: any[] };
    };
    Functions: {
      [key: string]: {
        Args: any;
        Returns: any;
      };
    };
    Enums: { [key: string]: string };
    CompositeTypes: { [key: string]: any };
  };
};
