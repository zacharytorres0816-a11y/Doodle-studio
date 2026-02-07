export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          additional_raffles: number
          created_at: string
          customer_name: string
          delivery_date: string | null
          delivery_notes: string | null
          delivery_recipient: string | null
          design_type: string
          gcash_reference: string | null
          grade: string
          id: string
          included_raffles: number
          order_date: string
          order_status: string
          package_base_cost: number
          package_type: number
          packed_date: string | null
          payment_method: string
          photo_status: string
          photo_uploaded_date: string | null
          project_completed_date: string | null
          raffle_cost: number
          section: string
          standard_design_id: string | null
          total_amount: number
          total_raffles: number
          updated_at: string
        }
        Insert: {
          additional_raffles?: number
          created_at?: string
          customer_name: string
          delivery_date?: string | null
          delivery_notes?: string | null
          delivery_recipient?: string | null
          design_type?: string
          gcash_reference?: string | null
          grade: string
          id?: string
          included_raffles?: number
          order_date?: string
          order_status?: string
          package_base_cost?: number
          package_type: number
          packed_date?: string | null
          payment_method?: string
          photo_status?: string
          photo_uploaded_date?: string | null
          project_completed_date?: string | null
          raffle_cost?: number
          section: string
          standard_design_id?: string | null
          total_amount?: number
          total_raffles?: number
          updated_at?: string
        }
        Update: {
          additional_raffles?: number
          created_at?: string
          customer_name?: string
          delivery_date?: string | null
          delivery_notes?: string | null
          delivery_recipient?: string | null
          design_type?: string
          gcash_reference?: string | null
          grade?: string
          id?: string
          included_raffles?: number
          order_date?: string
          order_status?: string
          package_base_cost?: number
          package_type?: number
          packed_date?: string | null
          payment_method?: string
          photo_status?: string
          photo_uploaded_date?: string | null
          project_completed_date?: string | null
          raffle_cost?: number
          section?: string
          standard_design_id?: string | null
          total_amount?: number
          total_raffles?: number
          updated_at?: string
        }
        Relationships: []
      }
      print_templates: {
        Row: {
          completed_at: string | null
          created_at: string
          downloaded_at: string | null
          final_image_url: string | null
          id: string
          printed_at: string | null
          slots_used: number
          status: string
          template_number: string
          total_slots: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          downloaded_at?: string | null
          final_image_url?: string | null
          id?: string
          printed_at?: string | null
          slots_used?: number
          status?: string
          template_number: string
          total_slots?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          downloaded_at?: string | null
          final_image_url?: string | null
          id?: string
          printed_at?: string | null
          slots_used?: number
          status?: string
          template_number?: string
          total_slots?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          canvas_data: Json | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          design_type: string | null
          frame_color: string | null
          grade: string | null
          id: string
          last_edited_at: string | null
          name: string
          order_id: string | null
          package_type: number | null
          photo_uploaded_at: string | null
          photo_url: string | null
          section: string | null
          status: string
          template_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          canvas_data?: Json | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          design_type?: string | null
          frame_color?: string | null
          grade?: string | null
          id?: string
          last_edited_at?: string | null
          name: string
          order_id?: string | null
          package_type?: number | null
          photo_uploaded_at?: string | null
          photo_url?: string | null
          section?: string | null
          status?: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          canvas_data?: Json | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          design_type?: string | null
          frame_color?: string | null
          grade?: string | null
          id?: string
          last_edited_at?: string | null
          name?: string
          order_id?: string | null
          package_type?: number | null
          photo_uploaded_at?: string | null
          photo_url?: string | null
          section?: string | null
          status?: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_entries: {
        Row: {
          created_at: string
          customer_name: string
          grade: string
          id: string
          is_winner: boolean
          order_id: string
          raffle_number: number
          section: string
          won_at: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          grade: string
          id?: string
          is_winner?: boolean
          order_id: string
          raffle_number: number
          section: string
          won_at?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          grade?: string
          id?: string
          is_winner?: boolean
          order_id?: string
          raffle_number?: number
          section?: string
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_winners: {
        Row: {
          customer_name: string
          entry_id: string
          grade: string
          id: string
          order_id: string
          prize_details: string | null
          section: string
          won_at: string
        }
        Insert: {
          customer_name: string
          entry_id: string
          grade: string
          id?: string
          order_id: string
          prize_details?: string | null
          section: string
          won_at?: string
        }
        Update: {
          customer_name?: string
          entry_id?: string
          grade?: string
          id?: string
          order_id?: string
          prize_details?: string | null
          section?: string
          won_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_winners_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "raffle_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_winners_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      template_slots: {
        Row: {
          grade: string | null
          id: string
          inserted_at: string
          order_id: string | null
          package_type: number | null
          photo_url: string | null
          position: number
          project_id: string | null
          section: string | null
          student_name: string | null
          template_id: string
        }
        Insert: {
          grade?: string | null
          id?: string
          inserted_at?: string
          order_id?: string | null
          package_type?: number | null
          photo_url?: string | null
          position: number
          project_id?: string | null
          section?: string | null
          student_name?: string | null
          template_id: string
        }
        Update: {
          grade?: string | null
          id?: string
          inserted_at?: string
          order_id?: string | null
          package_type?: number | null
          photo_url?: string | null
          position?: number
          project_id?: string | null
          section?: string | null
          student_name?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_slots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_slots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "print_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          id: string
          name: string
          preview_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          preview_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          preview_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
