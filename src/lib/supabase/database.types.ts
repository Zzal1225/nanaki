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
    PostgrestVersion: '14.18';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      budgets: {
        Row: {
          category_amounts: Json;
          created_at: string;
          month: string;
          total_amount: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_amounts?: Json;
          created_at?: string;
          month: string;
          total_amount?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category_amounts?: Json;
          created_at?: string;
          month?: string;
          total_amount?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fixed_expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          id: string;
          last_recorded_on: string | null;
          name: string;
          payment_method: string | null;
          schedule: Json;
          start_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          id?: string;
          last_recorded_on?: string | null;
          name: string;
          payment_method?: string | null;
          schedule: Json;
          start_date: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          id?: string;
          last_recorded_on?: string | null;
          name?: string;
          payment_method?: string | null;
          schedule?: Json;
          start_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      records: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          fields: Json;
          id: string;
          memo: string | null;
          occurred_at: string;
          tags: string[];
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          fields?: Json;
          id?: string;
          memo?: string | null;
          occurred_at: string;
          tags?: string[];
          title: string;
          type: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          fields?: Json;
          id?: string;
          memo?: string | null;
          occurred_at?: string;
          tags?: string[];
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          created_at: string;
          ended_on: string | null;
          goal: Json;
          id: string;
          name: string;
          schedule: Json;
          start_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_on?: string | null;
          goal: Json;
          id?: string;
          name: string;
          schedule: Json;
          start_date: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          ended_on?: string | null;
          goal?: Json;
          id?: string;
          name?: string;
          schedule?: Json;
          start_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          hidden_types: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          hidden_types?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          hidden_types?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_expired_guests: { Args: never; Returns: number };
      record_due_fixed_expenses: {
        Args: { p_today?: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
