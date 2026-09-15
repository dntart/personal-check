// Placeholder escrito a mano — reemplazar corriendo `npm run types:generate`
// contra el proyecto Supabase real (necesita SUPABASE_DB_URL en .env.local,
// ver .env.example). Mientras tanto, esta forma refleja fielmente las 4
// migraciones en docs/migrations/ para que el resto del código pueda tipar
// contra ella sin esperar a tener la DB levantada.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  personalcheck: {
    Tables: {
      organizaciones: {
        Row: {
          id: string;
          nombre: string;
          activo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          id: string;
          organizacion_id: string;
          nombre: string;
          email: string;
          rol: "admin" | "supervisor";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          organizacion_id: string;
          nombre: string;
          email: string;
          rol?: "admin" | "supervisor";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organizacion_id?: string;
          nombre?: string;
          email?: string;
          rol?: "admin" | "supervisor";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admins_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      super_admins: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_areas: {
        Row: {
          admin_id: string;
          area_id: string;
          created_at: string;
        };
        Insert: {
          admin_id: string;
          area_id: string;
          created_at?: string;
        };
        Update: {
          admin_id?: string;
          area_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_areas_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_areas_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      areas: {
        Row: {
          id: string;
          organizacion_id: string;
          nombre: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organizacion_id: string;
          nombre: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organizacion_id?: string;
          nombre?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "areas_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      operarios: {
        Row: {
          id: string;
          organizacion_id: string;
          area_id: string;
          nombre: string;
          activo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organizacion_id: string;
          area_id: string;
          nombre: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organizacion_id?: string;
          area_id?: string;
          nombre?: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "operarios_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operarios_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      horarios_semanales: {
        Row: {
          id: string;
          organizacion_id: string;
          operario_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
          vigente_desde: string;
          vigente_hasta: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organizacion_id: string;
          operario_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
          vigente_desde: string;
          vigente_hasta?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organizacion_id?: string;
          operario_id?: string;
          dia_semana?: number;
          hora_inicio?: string;
          hora_fin?: string;
          vigente_desde?: string;
          vigente_hasta?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "horarios_semanales_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "horarios_semanales_operario_id_fkey";
            columns: ["operario_id"];
            isOneToOne: false;
            referencedRelation: "operarios";
            referencedColumns: ["id"];
          },
        ];
      };
      tipos_movimiento: {
        Row: {
          id: string;
          codigo: string;
          nombre: string;
          impacto: "suma" | "resta" | "neutro";
          requiere_adjunto: boolean;
          unidad: "dias" | "minutos";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo: string;
          nombre: string;
          impacto: "suma" | "resta" | "neutro";
          requiere_adjunto?: boolean;
          unidad?: "dias" | "minutos";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          nombre?: string;
          impacto?: "suma" | "resta" | "neutro";
          requiere_adjunto?: boolean;
          unidad?: "dias" | "minutos";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      movimientos: {
        Row: {
          id: string;
          organizacion_id: string;
          operario_id: string;
          admin_id: string;
          tipo_movimiento_id: string;
          fecha: string;
          cantidad: number;
          observaciones: string | null;
          adjunto_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organizacion_id: string;
          operario_id: string;
          admin_id: string;
          tipo_movimiento_id: string;
          fecha: string;
          cantidad?: number;
          observaciones?: string | null;
          adjunto_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organizacion_id?: string;
          operario_id?: string;
          admin_id?: string;
          tipo_movimiento_id?: string;
          fecha?: string;
          cantidad?: number;
          observaciones?: string | null;
          adjunto_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "movimientos_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_operario_id_fkey";
            columns: ["operario_id"];
            isOneToOne: false;
            referencedRelation: "operarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimientos_tipo_movimiento_id_fkey";
            columns: ["tipo_movimiento_id"];
            isOneToOne: false;
            referencedRelation: "tipos_movimiento";
            referencedColumns: ["id"];
          },
        ];
      };
      auditoria: {
        Row: {
          id: string;
          organizacion_id: string;
          admin_id: string | null;
          super_admin_id: string | null;
          accion: "crear" | "editar" | "eliminar";
          entidad: string;
          entidad_id: string;
          datos_anteriores: Json | null;
          datos_nuevos: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organizacion_id: string;
          admin_id?: string | null;
          super_admin_id?: string | null;
          accion: "crear" | "editar" | "eliminar";
          entidad: string;
          entidad_id: string;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organizacion_id?: string;
          admin_id?: string | null;
          super_admin_id?: string | null;
          accion?: "crear" | "editar" | "eliminar";
          entidad?: string;
          entidad_id?: string;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "auditoria_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auditoria_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auditoria_super_admin_id_fkey";
            columns: ["super_admin_id"];
            isOneToOne: false;
            referencedRelation: "super_admins";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      org_actual: {
        Args: Record<string, never>;
        Returns: string;
      };
      es_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      rol_actual: {
        Args: Record<string, never>;
        Returns: string;
      };
      puede_ver_area: {
        Args: { p_area_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PersonalcheckSchema = Database["personalcheck"];

export type Tables<T extends keyof PersonalcheckSchema["Tables"]> =
  PersonalcheckSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PersonalcheckSchema["Tables"]> =
  PersonalcheckSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PersonalcheckSchema["Tables"]> =
  PersonalcheckSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PersonalcheckSchema["Enums"]> =
  PersonalcheckSchema["Enums"][T];
