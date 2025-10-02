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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      organizations: {
        Row: {
          organization_id: string
          organization_name: string
          organization_slug: string
          organization_settings: Json | null
          organization_created_at: string | null
          organization_updated_at: string | null
        }
        Insert: {
          organization_id?: string
          organization_name: string
          organization_slug: string
          organization_settings?: Json | null
          organization_created_at?: string | null
          organization_updated_at?: string | null
        }
        Update: {
          organization_id?: string
          organization_name?: string
          organization_slug?: string
          organization_settings?: Json | null
          organization_created_at?: string | null
          organization_updated_at?: string | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          organization_member_id: string
          organization_id: string | null
          user_id: string | null
          member_role: string | null
          member_joined_at: string | null
          member_is_active: boolean | null
        }
        Insert: {
          organization_member_id?: string
          organization_id?: string | null
          user_id?: string | null
          member_role?: string | null
          member_joined_at?: string | null
          member_is_active?: boolean | null
        }
        Update: {
          organization_member_id?: string
          organization_id?: string | null
          user_id?: string | null
          member_role?: string | null
          member_joined_at?: string | null
          member_is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      supported_currencies: {
        Row: {
          currency_code: string
          currency_name: string
          currency_symbol: string | null
          currency_decimal_places: number | null
          currency_is_active: boolean | null
          currency_created_at: string | null
        }
        Insert: {
          currency_code: string
          currency_name: string
          currency_symbol?: string | null
          currency_decimal_places?: number | null
          currency_is_active?: boolean | null
          currency_created_at?: string | null
        }
        Update: {
          currency_code?: string
          currency_name?: string
          currency_symbol?: string | null
          currency_decimal_places?: number | null
          currency_is_active?: boolean | null
          currency_created_at?: string | null
        }
        Relationships: []
      }
      supported_data_sources: {
        Row: {
          data_source_id: string
          data_source_name: string
          data_source_type: string
          data_source_is_active: boolean | null
          data_source_created_at: string | null
        }
        Insert: {
          data_source_id?: string
          data_source_name: string
          data_source_type: string
          data_source_is_active?: boolean | null
          data_source_created_at?: string | null
        }
        Update: {
          data_source_id?: string
          data_source_name?: string
          data_source_type?: string
          data_source_is_active?: boolean | null
          data_source_created_at?: string | null
        }
        Relationships: []
      }
      organization_data_source_connections: {
        Row: {
          connection_id: string
          organization_id: string | null
          data_source_id: string | null
          connection_name: string | null
          connection_settings: Json | null
          connection_is_active: boolean | null
          connection_created_at: string | null
          connection_updated_at: string | null
        }
        Insert: {
          connection_id?: string
          organization_id?: string | null
          data_source_id?: string | null
          connection_name?: string | null
          connection_settings?: Json | null
          connection_is_active?: boolean | null
          connection_created_at?: string | null
          connection_updated_at?: string | null
        }
        Update: {
          connection_id?: string
          organization_id?: string | null
          data_source_id?: string | null
          connection_name?: string | null
          connection_settings?: Json | null
          connection_is_active?: boolean | null
          connection_created_at?: string | null
          connection_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_data_source_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_data_source_connections_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "supported_data_sources"
            referencedColumns: ["data_source_id"]
          }
        ]
      }
      opportunities_raw: {
        Row: {
          opportunity_id: string
          organization_id: string | null
          data_source_connection_id: string | null
          source_system_opportunity_id: string
          source_system_name: string
          opportunity_name: string | null
          opportunity_amount: number | null
          opportunity_currency_code: string | null
          opportunity_stage_name: string | null
          opportunity_type: string | null
          opportunity_lead_source: string | null
          opportunity_created_date: string | null
          opportunity_close_date: string | null
          opportunity_last_modified_date: string | null
          customer_tier: string | null
          customer_market_segment: string | null
          customer_sales_channel: string | null
          customer_country: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
          record_updated_at: string | null
        }
        Insert: {
          opportunity_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_opportunity_id: string
          source_system_name: string
          opportunity_name?: string | null
          opportunity_amount?: number | null
          opportunity_currency_code?: string | null
          opportunity_stage_name?: string | null
          opportunity_type?: string | null
          opportunity_lead_source?: string | null
          opportunity_created_date?: string | null
          opportunity_close_date?: string | null
          opportunity_last_modified_date?: string | null
          customer_tier?: string | null
          customer_market_segment?: string | null
          customer_sales_channel?: string | null
          customer_country?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Update: {
          opportunity_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_opportunity_id?: string
          source_system_name?: string
          opportunity_name?: string | null
          opportunity_amount?: number | null
          opportunity_currency_code?: string | null
          opportunity_stage_name?: string | null
          opportunity_type?: string | null
          opportunity_lead_source?: string | null
          opportunity_created_date?: string | null
          opportunity_close_date?: string | null
          opportunity_last_modified_date?: string | null
          customer_tier?: string | null
          customer_market_segment?: string | null
          customer_sales_channel?: string | null
          customer_country?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "opportunities_raw_data_source_connection_id_fkey"
            columns: ["data_source_connection_id"]
            isOneToOne: false
            referencedRelation: "organization_data_source_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "opportunities_raw_opportunity_currency_code_fkey"
            columns: ["opportunity_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["currency_code"]
          }
        ]
      }
      quotes_raw: {
        Row: {
          quote_id: string
          organization_id: string | null
          data_source_connection_id: string | null
          parent_opportunity_id: string | null
          source_system_quote_id: string
          source_system_name: string
          quote_name: string | null
          quote_status: string | null
          quote_net_amount: number | null
          quote_currency_code: string | null
          quote_type: string | null
          quote_created_date: string | null
          quote_start_date: string | null
          quote_expiration_date: string | null
          quote_end_date: string | null
          is_quote_ordered: boolean | null
          is_primary_quote: boolean | null
          is_renewal_quote: boolean | null
          is_amendment_quote: boolean | null
          is_cancellation_quote: boolean | null
          quote_total_amount: number | null
          quote_total_arr: number | null
          quote_new_arr: number | null
          quote_annual_recurring_revenue: number | null
          quote_approval_status: string | null
          quote_subsidiary: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
          record_updated_at: string | null
        }
        Insert: {
          quote_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          parent_opportunity_id?: string | null
          source_system_quote_id: string
          source_system_name: string
          quote_name?: string | null
          quote_status?: string | null
          quote_net_amount?: number | null
          quote_currency_code?: string | null
          quote_type?: string | null
          quote_created_date?: string | null
          quote_start_date?: string | null
          quote_expiration_date?: string | null
          quote_end_date?: string | null
          is_quote_ordered?: boolean | null
          is_primary_quote?: boolean | null
          is_renewal_quote?: boolean | null
          is_amendment_quote?: boolean | null
          is_cancellation_quote?: boolean | null
          quote_total_amount?: number | null
          quote_total_arr?: number | null
          quote_new_arr?: number | null
          quote_annual_recurring_revenue?: number | null
          quote_approval_status?: string | null
          quote_subsidiary?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Update: {
          quote_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          parent_opportunity_id?: string | null
          source_system_quote_id?: string
          source_system_name?: string
          quote_name?: string | null
          quote_status?: string | null
          quote_net_amount?: number | null
          quote_currency_code?: string | null
          quote_type?: string | null
          quote_created_date?: string | null
          quote_start_date?: string | null
          quote_expiration_date?: string | null
          quote_end_date?: string | null
          is_quote_ordered?: boolean | null
          is_primary_quote?: boolean | null
          is_renewal_quote?: boolean | null
          is_amendment_quote?: boolean | null
          is_cancellation_quote?: boolean | null
          quote_total_amount?: number | null
          quote_total_arr?: number | null
          quote_new_arr?: number | null
          quote_annual_recurring_revenue?: number | null
          quote_approval_status?: string | null
          quote_subsidiary?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quotes_raw_data_source_connection_id_fkey"
            columns: ["data_source_connection_id"]
            isOneToOne: false
            referencedRelation: "organization_data_source_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "quotes_raw_parent_opportunity_id_fkey"
            columns: ["parent_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_raw"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "quotes_raw_quote_currency_code_fkey"
            columns: ["quote_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["currency_code"]
          }
        ]
      }
      orders_raw: {
        Row: {
          order_id: string
          organization_id: string | null
          data_source_connection_id: string | null
          parent_opportunity_id: string | null
          parent_quote_id: string | null
          source_system_order_id: string
          source_system_name: string
          order_name: string | null
          order_status: string | null
          order_total_amount: number | null
          order_currency_code: string | null
          order_type: string | null
          order_created_date: string | null
          order_effective_date: string | null
          order_number: string | null
          order_billing_frequency: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
          record_updated_at: string | null
        }
        Insert: {
          order_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          parent_opportunity_id?: string | null
          parent_quote_id?: string | null
          source_system_order_id: string
          source_system_name: string
          order_name?: string | null
          order_status?: string | null
          order_total_amount?: number | null
          order_currency_code?: string | null
          order_type?: string | null
          order_created_date?: string | null
          order_effective_date?: string | null
          order_number?: string | null
          order_billing_frequency?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Update: {
          order_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          parent_opportunity_id?: string | null
          parent_quote_id?: string | null
          source_system_order_id?: string
          source_system_name?: string
          order_name?: string | null
          order_status?: string | null
          order_total_amount?: number | null
          order_currency_code?: string | null
          order_type?: string | null
          order_created_date?: string | null
          order_effective_date?: string | null
          order_number?: string | null
          order_billing_frequency?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_raw_data_source_connection_id_fkey"
            columns: ["data_source_connection_id"]
            isOneToOne: false
            referencedRelation: "organization_data_source_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "orders_raw_parent_opportunity_id_fkey"
            columns: ["parent_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_raw"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "orders_raw_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_raw"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "orders_raw_order_currency_code_fkey"
            columns: ["order_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["currency_code"]
          }
        ]
      }
      invoices_raw: {
        Row: {
          invoice_id: string
          organization_id: string | null
          data_source_connection_id: string | null
          source_system_invoice_id: string
          source_system_name: string
          invoice_transaction_id: string | null
          invoice_transaction_date: string | null
          invoice_status: string | null
          invoice_customer_name: string | null
          invoice_total_amount: number | null
          invoice_currency_code: string | null
          invoice_subtotal_amount: number | null
          invoice_tax_total_amount: number | null
          invoice_discount_total_amount: number | null
          invoice_created_date: string | null
          invoice_last_modified_date: string | null
          linked_order_number: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
          record_updated_at: string | null
          linked_opportunity_uuid: string | null
          linked_quote_uuid: string | null
        }
        Insert: {
          invoice_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_invoice_id: string
          source_system_name: string
          invoice_transaction_id?: string | null
          invoice_transaction_date?: string | null
          invoice_status?: string | null
          invoice_customer_name?: string | null
          invoice_total_amount?: number | null
          invoice_currency_code?: string | null
          invoice_subtotal_amount?: number | null
          invoice_tax_total_amount?: number | null
          invoice_discount_total_amount?: number | null
          invoice_created_date?: string | null
          invoice_last_modified_date?: string | null
          linked_order_number?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
          linked_opportunity_uuid?: string | null
          linked_quote_uuid?: string | null
        }
        Update: {
          invoice_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_invoice_id?: string
          source_system_name?: string
          invoice_transaction_id?: string | null
          invoice_transaction_date?: string | null
          invoice_status?: string | null
          invoice_customer_name?: string | null
          invoice_total_amount?: number | null
          invoice_currency_code?: string | null
          invoice_subtotal_amount?: number | null
          invoice_tax_total_amount?: number | null
          invoice_discount_total_amount?: number | null
          invoice_created_date?: string | null
          invoice_last_modified_date?: string | null
          linked_order_number?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
          linked_opportunity_uuid?: string | null
          linked_quote_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_raw_data_source_connection_id_fkey"
            columns: ["data_source_connection_id"]
            isOneToOne: false
            referencedRelation: "organization_data_source_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "invoices_raw_invoice_currency_code_fkey"
            columns: ["invoice_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["currency_code"]
          },
          {
            foreignKeyName: "fk_invoices_linked_opportunity_uuid"
            columns: ["linked_opportunity_uuid"]
            isOneToOne: false
            referencedRelation: "opportunities_raw"
            referencedColumns: ["opportunity_id"]
          },
          {
            foreignKeyName: "fk_invoices_linked_quote_uuid"
            columns: ["linked_quote_uuid"]
            isOneToOne: false
            referencedRelation: "quotes_raw"
            referencedColumns: ["quote_id"]
          }
        ]
      }
      customer_payments_raw: {
        Row: {
          payment_id: string
          organization_id: string | null
          data_source_connection_id: string | null
          source_system_payment_id: string
          source_system_name: string
          payment_transaction_id: string | null
          payment_transaction_date: string | null
          payment_status: string | null
          payment_customer_name: string | null
          payment_total_amount: number | null
          payment_currency_code: string | null
          payment_method: string | null
          payment_reference_number: string | null
          payment_created_date: string | null
          payment_last_modified_date: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
          record_updated_at: string | null
        }
        Insert: {
          payment_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_payment_id: string
          source_system_name: string
          payment_transaction_id?: string | null
          payment_transaction_date?: string | null
          payment_status?: string | null
          payment_customer_name?: string | null
          payment_total_amount?: number | null
          payment_currency_code?: string | null
          payment_method?: string | null
          payment_reference_number?: string | null
          payment_created_date?: string | null
          payment_last_modified_date?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Update: {
          payment_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_payment_id?: string
          source_system_name?: string
          payment_transaction_id?: string | null
          payment_transaction_date?: string | null
          payment_status?: string | null
          payment_customer_name?: string | null
          payment_total_amount?: number | null
          payment_currency_code?: string | null
          payment_method?: string | null
          payment_reference_number?: string | null
          payment_created_date?: string | null
          payment_last_modified_date?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_payments_raw_data_source_connection_id_fkey"
            columns: ["data_source_connection_id"]
            isOneToOne: false
            referencedRelation: "organization_data_source_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "customer_payments_raw_payment_currency_code_fkey"
            columns: ["payment_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["currency_code"]
          }
        ]
      }
      payment_applications_raw: {
        Row: {
          payment_application_id: string
          organization_id: string | null
          parent_payment_id: string | null
          applied_to_invoice_id: string | null
          payment_application_date: string | null
          payment_application_amount: number | null
          payment_application_reference_number: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
        }
        Insert: {
          payment_application_id?: string
          organization_id?: string | null
          parent_payment_id?: string | null
          applied_to_invoice_id?: string | null
          payment_application_date?: string | null
          payment_application_amount?: number | null
          payment_application_reference_number?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
        }
        Update: {
          payment_application_id?: string
          organization_id?: string | null
          parent_payment_id?: string | null
          applied_to_invoice_id?: string | null
          payment_application_date?: string | null
          payment_application_amount?: number | null
          payment_application_reference_number?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_applications_raw_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments_raw"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "payment_applications_raw_applied_to_invoice_id_fkey"
            columns: ["applied_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_raw"
            referencedColumns: ["invoice_id"]
          }
        ]
      }
      credit_memos_raw: {
        Row: {
          credit_memo_id: string
          organization_id: string | null
          data_source_connection_id: string | null
          source_system_credit_memo_id: string
          source_system_name: string
          credit_memo_transaction_id: string | null
          credit_memo_transaction_date: string | null
          credit_memo_status: string | null
          credit_memo_customer_name: string | null
          credit_memo_total_amount: number | null
          credit_memo_currency_code: string | null
          credit_memo_subtotal_amount: number | null
          credit_memo_tax_total_amount: number | null
          credit_memo_created_date: string | null
          credit_memo_last_modified_date: string | null
          raw_source_system_data: Json | null
          data_fetched_at: string | null
          record_created_at: string | null
          record_updated_at: string | null
        }
        Insert: {
          credit_memo_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_credit_memo_id: string
          source_system_name: string
          credit_memo_transaction_id?: string | null
          credit_memo_transaction_date?: string | null
          credit_memo_status?: string | null
          credit_memo_customer_name?: string | null
          credit_memo_total_amount?: number | null
          credit_memo_currency_code?: string | null
          credit_memo_subtotal_amount?: number | null
          credit_memo_tax_total_amount?: number | null
          credit_memo_created_date?: string | null
          credit_memo_last_modified_date?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Update: {
          credit_memo_id?: string
          organization_id?: string | null
          data_source_connection_id?: string | null
          source_system_credit_memo_id?: string
          source_system_name?: string
          credit_memo_transaction_id?: string | null
          credit_memo_transaction_date?: string | null
          credit_memo_status?: string | null
          credit_memo_customer_name?: string | null
          credit_memo_total_amount?: number | null
          credit_memo_currency_code?: string | null
          credit_memo_subtotal_amount?: number | null
          credit_memo_tax_total_amount?: number | null
          credit_memo_created_date?: string | null
          credit_memo_last_modified_date?: string | null
          raw_source_system_data?: Json | null
          data_fetched_at?: string | null
          record_created_at?: string | null
          record_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_memos_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "credit_memos_raw_data_source_connection_id_fkey"
            columns: ["data_source_connection_id"]
            isOneToOne: false
            referencedRelation: "organization_data_source_connections"
            referencedColumns: ["connection_id"]
          },
          {
            foreignKeyName: "credit_memos_raw_credit_memo_currency_code_fkey"
            columns: ["credit_memo_currency_code"]
            isOneToOne: false
            referencedRelation: "supported_currencies"
            referencedColumns: ["currency_code"]
          }
        ]
      }
      historical_exchange_rates: {
        Row: {
          exchange_rate_id: string
          from_currency_code: string | null
          to_currency_code: string | null
          exchange_rate_value: number
          rate_effective_date: string
          rate_source: string | null
          organization_id: string | null
          rate_created_at: string | null
          rate_updated_at: string | null
        }
        Insert: {
          exchange_rate_id?: string
          from_currency_code?: string | null
          to_currency_code?: string | null
          exchange_rate_value: number
          rate_effective_date: string
          rate_source?: string | null
          organization_id?: string | null
          rate_created_at?: string | null
          rate_updated_at?: string | null
        }
        Update: {
          exchange_rate_id?: string
          from_currency_code?: string | null
          to_currency_code?: string | null
          exchange_rate_value?: number
          rate_effective_date?: string
          rate_source?: string | null
          organization_id?: string | null
          rate_created_at?: string | null
          rate_updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_exchange_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          }
        ]
      }
      integration_tokens: {
        Row: {
          id: string
          provider: string
          tenant_id: string
          token: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider: string
          tenant_id: string
          token: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider?: string
          tenant_id?: string
          token?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pricebook_raw: {
        Row: {
          id: string
          name: string
          is_active: boolean | null
          created_date: string
          last_modified_date: string
        }
        Insert: {
          id: string
          name: string
          is_active?: boolean | null
          created_date: string
          last_modified_date: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean | null
          created_date?: string
          last_modified_date?: string
        }
        Relationships: []
      }
      products_raw: {
        Row: {
          id: string
          name: string
          product_code: string
          is_active: boolean | null
          created_date: string
          last_modified_date: string
        }
        Insert: {
          id: string
          name: string
          product_code: string
          is_active?: boolean | null
          created_date: string
          last_modified_date: string
        }
        Update: {
          id?: string
          name?: string
          product_code?: string
          is_active?: boolean | null
          created_date?: string
          last_modified_date?: string
        }
        Relationships: []
      }
      salesforce_auto_renewal_metrics: {
        Row: {
          id: string
          total_renewals: number
          auto_renewals: number
          auto_renewal_rate: number
          calculation_date: string
          date_from: string
          date_to: string
          tenant_id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          total_renewals: number
          auto_renewals: number
          auto_renewal_rate: number
          calculation_date: string
          date_from: string
          date_to: string
          tenant_id: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          total_renewals?: number
          auto_renewals?: number
          auto_renewal_rate?: number
          calculation_date?: string
          date_from?: string
          date_to?: string
          tenant_id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salesforce_pricebook_metrics: {
        Row: {
          id: string
          total_pricebooks: number
          active_pricebooks: number
          calculation_date: string
          tenant_id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          total_pricebooks: number
          active_pricebooks: number
          calculation_date: string
          tenant_id: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          total_pricebooks?: number
          active_pricebooks?: number
          calculation_date?: string
          tenant_id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salesforce_product_metrics: {
        Row: {
          id: string
          total_products: number
          active_products: number
          calculation_date: string
          tenant_id: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          total_products: number
          active_products: number
          calculation_date: string
          tenant_id: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          total_products?: number
          active_products?: number
          calculation_date?: string
          tenant_id?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
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
