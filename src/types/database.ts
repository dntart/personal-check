// Generado automáticamente — NO editar a mano.
// Fuente: schema `personalcheck` del proyecto Supabase compartido del portfolio.
// Regenerar con: npm run types:generate
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  personalcheck: {
    Tables: {
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
      admins: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string;
          id: string;
          nombre: string;
          organizacion_id: string;
          rol: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          id: string;
          nombre: string;
          organizacion_id: string;
          rol?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          id?: string;
          nombre?: string;
          organizacion_id?: string;
          rol?: string;
          updated_at?: string;
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
      areas: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          nombre: string;
          organizacion_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          nombre: string;
          organizacion_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          nombre?: string;
          organizacion_id?: string;
          updated_at?: string;
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
      auditoria: {
        Row: {
          accion: string;
          admin_id: string | null;
          created_at: string;
          datos_anteriores: Json | null;
          datos_nuevos: Json | null;
          entidad: string;
          entidad_id: string;
          id: string;
          organizacion_id: string;
          super_admin_id: string | null;
        };
        Insert: {
          accion: string;
          admin_id?: string | null;
          created_at?: string;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          entidad: string;
          entidad_id: string;
          id?: string;
          organizacion_id: string;
          super_admin_id?: string | null;
        };
        Update: {
          accion?: string;
          admin_id?: string | null;
          created_at?: string;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          entidad?: string;
          entidad_id?: string;
          id?: string;
          organizacion_id?: string;
          super_admin_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "auditoria_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "auditoria_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
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
      horarios_semanales: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          dia_semana: number;
          hora_fin: string;
          hora_inicio: string;
          id: string;
          operario_id: string;
          organizacion_id: string;
          updated_at: string;
          vigente_desde: string;
          vigente_hasta: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          dia_semana: number;
          hora_fin: string;
          hora_inicio: string;
          id?: string;
          operario_id: string;
          organizacion_id: string;
          updated_at?: string;
          vigente_desde: string;
          vigente_hasta?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          dia_semana?: number;
          hora_fin?: string;
          hora_inicio?: string;
          id?: string;
          operario_id?: string;
          organizacion_id?: string;
          updated_at?: string;
          vigente_desde?: string;
          vigente_hasta?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "horarios_semanales_operario_id_fkey";
            columns: ["operario_id"];
            isOneToOne: false;
            referencedRelation: "operarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "horarios_semanales_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      movimientos: {
        Row: {
          adjunto_url: string | null;
          admin_id: string;
          cantidad: number;
          created_at: string;
          deleted_at: string | null;
          fecha: string;
          id: string;
          observaciones: string | null;
          operario_id: string;
          organizacion_id: string;
          tipo_movimiento_id: string;
          updated_at: string;
        };
        Insert: {
          adjunto_url?: string | null;
          admin_id: string;
          cantidad?: number;
          created_at?: string;
          deleted_at?: string | null;
          fecha: string;
          id?: string;
          observaciones?: string | null;
          operario_id: string;
          organizacion_id: string;
          tipo_movimiento_id: string;
          updated_at?: string;
        };
        Update: {
          adjunto_url?: string | null;
          admin_id?: string;
          cantidad?: number;
          created_at?: string;
          deleted_at?: string | null;
          fecha?: string;
          id?: string;
          observaciones?: string | null;
          operario_id?: string;
          organizacion_id?: string;
          tipo_movimiento_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movimientos_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
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
            foreignKeyName: "movimientos_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
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
      operarios: {
        Row: {
          activo: boolean;
          area_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          nombre: string;
          organizacion_id: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          area_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          nombre: string;
          organizacion_id: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          area_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          nombre?: string;
          organizacion_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operarios_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operarios_organizacion_id_fkey";
            columns: ["organizacion_id"];
            isOneToOne: false;
            referencedRelation: "organizaciones";
            referencedColumns: ["id"];
          },
        ];
      };
      organizaciones: {
        Row: {
          activo: boolean;
          created_at: string;
          deleted_at: string | null;
          id: string;
          nombre: string;
          updated_at: string;
        };
        Insert: {
          activo?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          nombre: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          nombre?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      super_admins: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          nombre: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          nombre: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          nombre?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tipos_movimiento: {
        Row: {
          codigo: string;
          created_at: string;
          id: string;
          impacto: string;
          nombre: string;
          requiere_adjunto: boolean;
          unidad: string;
          updated_at: string;
        };
        Insert: {
          codigo: string;
          created_at?: string;
          id?: string;
          impacto: string;
          nombre: string;
          requiere_adjunto?: boolean;
          unidad?: string;
          updated_at?: string;
        };
        Update: {
          codigo?: string;
          created_at?: string;
          id?: string;
          impacto?: string;
          nombre?: string;
          requiere_adjunto?: boolean;
          unidad?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      es_super_admin: { Args: never; Returns: boolean };
      org_actual: { Args: never; Returns: string };
      puede_ver_area: { Args: { p_area_id: string }; Returns: boolean };
      rol_actual: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  personalcheck: {
    Enums: {},
  },
} as const;
