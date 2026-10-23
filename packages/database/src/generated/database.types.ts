export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_profiles: {
        Row: {
          created_at: string
          owner_id: string
          pseudonym: string
          revision: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          pseudonym: string
          revision?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          pseudonym?: string
          revision?: number
          updated_at?: string
        }
        Relationships: []
      }
      personal_tower_items: {
        Row: {
          created_at: string
          position: number
          protocol_id: string
          protocol_version: number
          tower_id: string
        }
        Insert: {
          created_at?: string
          position: number
          protocol_id: string
          protocol_version: number
          tower_id: string
        }
        Update: {
          created_at?: string
          position?: number
          protocol_id?: string
          protocol_version?: number
          tower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_tower_items_protocol_version_fkey"
            columns: ["protocol_id", "protocol_version"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["protocol_id", "version"]
          },
          {
            foreignKeyName: "personal_tower_items_tower_id_fkey"
            columns: ["tower_id"]
            isOneToOne: false
            referencedRelation: "personal_towers"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_towers: {
        Row: {
          audience: string
          cadence: string
          created_at: string
          custom_dates: string[]
          definition: string | null
          id: string
          identity_mode: string
          owner_id: string
          revision: number
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          cadence?: string
          created_at?: string
          custom_dates?: string[]
          definition?: string | null
          id?: string
          identity_mode?: string
          owner_id: string
          revision?: number
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          cadence?: string
          created_at?: string
          custom_dates?: string[]
          definition?: string | null
          id?: string
          identity_mode?: string
          owner_id?: string
          revision?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tower_checkin_protocol_marks: {
        Row: {
          checkin_id: string
          protocol_id: string
          ran: boolean
        }
        Insert: {
          checkin_id: string
          protocol_id: string
          ran: boolean
        }
        Update: {
          checkin_id?: string
          protocol_id?: string
          ran?: boolean
        }
        Relationships: []
      }
      tower_checkin_responses: {
        Row: {
          checkin_id: string
          completion: string | null
          metric_id: string
          numeric_value: string | null
          secondary_numeric: string | null
          skipped: boolean
          text_value: string | null
        }
        Insert: {
          checkin_id: string
          completion?: string | null
          metric_id: string
          numeric_value?: string | null
          secondary_numeric?: string | null
          skipped: boolean
          text_value?: string | null
        }
        Update: {
          checkin_id?: string
          completion?: string | null
          metric_id?: string
          numeric_value?: string | null
          secondary_numeric?: string | null
          skipped?: boolean
          text_value?: string | null
        }
        Relationships: []
      }
      tower_checkins: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          period_date: string
          tower_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          period_date: string
          tower_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          period_date?: string
          tower_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tower_metrics: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          position: number
          preset_key: string | null
          shape: string
          tower_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          position: number
          preset_key?: string | null
          shape: string
          tower_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          position?: number
          preset_key?: string | null
          shape?: string
          tower_id?: string
        }
        Relationships: []
      }
      tower_protocols: {
        Row: {
          created_at: string
          how_to: string
          id: string
          position: number
          source_protocol_id: string | null
          source_protocol_version: number | null
          title: string
          tower_id: string
        }
        Insert: {
          created_at?: string
          how_to: string
          id?: string
          position: number
          source_protocol_id?: string | null
          source_protocol_version?: number | null
          title: string
          tower_id: string
        }
        Update: {
          created_at?: string
          how_to?: string
          id?: string
          position?: number
          source_protocol_id?: string | null
          source_protocol_version?: number | null
          title?: string
          tower_id?: string
        }
        Relationships: []
      }
      protocol_practice_checkins: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          practice_date: string
          protocol_id: string
          protocol_version: number
          tower_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          practice_date: string
          protocol_id: string
          protocol_version: number
          tower_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          practice_date?: string
          protocol_id?: string
          protocol_version?: number
          tower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_practice_checkins_protocol_version_fkey"
            columns: ["protocol_id", "protocol_version"]
            isOneToOne: false
            referencedRelation: "protocol_versions"
            referencedColumns: ["protocol_id", "version"]
          },
          {
            foreignKeyName: "protocol_practice_checkins_tower_owner_fkey"
            columns: ["tower_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "personal_towers"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      protocol_versions: {
        Row: {
          cautions: Json
          created_at: string
          overview: string
          protocol_id: string
          published_at: string | null
          reference_links: Json
          steps: Json
          summary: string
          title: string
          version: number
        }
        Insert: {
          cautions: Json
          created_at?: string
          overview: string
          protocol_id: string
          published_at?: string | null
          reference_links?: Json
          steps: Json
          summary: string
          title: string
          version: number
        }
        Update: {
          cautions?: Json
          created_at?: string
          overview?: string
          protocol_id?: string
          published_at?: string | null
          reference_links?: Json
          steps?: Json
          summary?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_versions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "published_protocol_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          created_at: string
          id: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      published_protocol_catalog: {
        Row: {
          cautions: Json | null
          id: string | null
          overview: string | null
          published_at: string | null
          reference_links: Json | null
          slug: string | null
          steps: Json | null
          summary: string | null
          title: string | null
          version: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_configured_personal_tower: {
        Args: {
          candidate_audience: string
          candidate_cadence: string
          candidate_custom_dates: string[]
          candidate_definition: string | null
          candidate_identity: string
          candidate_metrics: Json
          candidate_protocols: Json
          candidate_title: string
        }
        Returns: {
          audience: string
          cadence: string
          created_at: string
          custom_dates: string[]
          definition: string | null
          id: string
          identity_mode: string
          revision: number
          title: string
          updated_at: string
        }[]
      }
      create_personal_tower: {
        Args: { candidate_title: string }
        Returns: {
          created_at: string
          id: string
          revision: number
          title: string
          updated_at: string
        }[]
      }
      delete_personal_tower: {
        Args: { candidate_id: string; expected_revision: number }
        Returns: boolean
      }
      save_account_pseudonym: {
        Args: { candidate_pseudonym: string; expected_revision?: number }
        Returns: {
          created_at: string
          pseudonym: string
          revision: number
          updated_at: string
        }[]
      }
      record_tower_checkin: {
        Args: {
          candidate_marks: Json
          candidate_period_date: string
          candidate_responses: Json
          candidate_tower_id: string
        }
        Returns: string
      }
      save_personal_tower: {
        Args: {
          candidate_id: string
          candidate_items: Json
          candidate_title: string
          expected_revision: number
        }
        Returns: {
          created_at: string
          id: string
          revision: number
          title: string
          updated_at: string
        }[]
      }
      save_tower_setup: {
        Args: {
          candidate_audience: string
          candidate_cadence: string
          candidate_custom_dates: string[]
          candidate_definition: string | null
          candidate_id: string
          candidate_identity: string
          candidate_metrics: Json
          candidate_title: string
          candidate_protocols: Json
          expected_revision: number
        }
        Returns: {
          audience: string
          cadence: string
          created_at: string
          custom_dates: string[]
          definition: string | null
          id: string
          identity_mode: string
          revision: number
          title: string
          updated_at: string
        }[]
      }
      set_protocol_practice_checkin: {
        Args: {
          candidate_practice_date: string
          candidate_protocol_id: string
          candidate_protocol_version: number
          candidate_recorded: boolean
          candidate_tower_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
