import crypto from "crypto";

/**
 * NetSuite REST API client - matching Python working implementation
 * This provides a clean interface for fetching data from NetSuite REST API
 */
export class NetSuiteClient {
  private accountId: string;
  private consumerKey: string;
  private consumerSecret: string;
  private tokenId: string;
  private tokenSecret: string;

  constructor() {
    const {
      NS_ACCOUNT_ID,
      NS_CONSUMER_KEY,
      NS_CONSUMER_SECRET,
      NS_TOKEN_ID,
      NS_TOKEN_SECRET,
    } = process.env;

    if (!NS_ACCOUNT_ID || !NS_CONSUMER_KEY || !NS_CONSUMER_SECRET || !NS_TOKEN_ID || !NS_TOKEN_SECRET) {
      throw new Error("Missing NetSuite configuration");
    }

    // Convert account ID to lowercase with dash format for API hostname (matching Python working code)
    let accountId = NS_ACCOUNT_ID.toLowerCase();
    if (accountId.includes('_')) {
      accountId = accountId.replace('_', '-');
    }

    // Debug logging (commented out for production)
    // console.log(`🔍 [NetSuite] Account ID: ${NS_ACCOUNT_ID} -> ${accountId}`);
    // console.log(`🔍 [NetSuite] Consumer Key: ${NS_CONSUMER_KEY ? 'Set' : 'Missing'}`);
    // console.log(`🔍 [NetSuite] Token ID: ${NS_TOKEN_ID ? 'Set' : 'Missing'}`);

    this.accountId = accountId;
    this.consumerKey = NS_CONSUMER_KEY;
    this.consumerSecret = NS_CONSUMER_SECRET;
    this.tokenId = NS_TOKEN_ID;
    this.tokenSecret = NS_TOKEN_SECRET;
  }

  /**
   * Generate OAuth header - matching Python working code exactly
   */
  private generateOAuthHeader(url: string, method: string, queryParams: Record<string, string> = {}): string {
    const oauth_nonce = crypto.randomBytes(16).toString("hex");
    const oauth_timestamp = Math.floor(Date.now() / 1000).toString();
    
    // OAuth parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.tokenId,
      oauth_nonce,
      oauth_timestamp,
      oauth_signature_method: "HMAC-SHA256",
      oauth_version: "1.0",
    };

    // Combine OAuth params with query params for signature calculation
    const allParams = { ...oauthParams, ...queryParams };

    // Sort parameters and create parameter string
    const sorted = Object.keys(allParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
      .join("&");

    // Create base string - match Python exactly
    const baseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sorted),
    ].join("&");

    // Create signing key - match Python exactly
    const signingKey = `${this.consumerSecret}&${this.tokenSecret}`;
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(baseString)
      .digest("base64");

    // OAuth header should only contain OAuth parameters, not query parameters
    const headerParams: Record<string, string> = {
      ...oauthParams,
      oauth_signature: signature,
    };

    // Add realm parameter like Python code
    const realm = process.env.NS_ACCOUNT_ID;
    return `OAuth realm="${realm}", ` + Object.keys(headerParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(headerParams[k])}"`)
      .join(", ");
  }

  /**
   * Fetch data from NetSuite REST API with retry logic
   */
  async fetchData(endpoint: string, queryParams: Record<string, string> = {}, retryCount: number = 0): Promise<any> {
    const baseUrl = `https://${this.accountId}.suitetalk.api.netsuite.com/services/rest/record/v1/${endpoint}`;
    const url = new URL(baseUrl);
    
    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    // Generate OAuth header using base URL (without query parameters) but include query params in signature
    const authHeader = this.generateOAuthHeader(baseUrl, "GET", queryParams);

    // Debug logging (commented out for production)
    // console.log(`🔍 [NetSuite] Fetching: ${url.toString()}`);
    // console.log(`🔍 [NetSuite] OAuth Header: ${authHeader.substring(0, 100)}...`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`⏳ [NetSuite] Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchData(endpoint, queryParams, retryCount + 1);
      }
      
      throw new Error(`NetSuite API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Convert date from yyyy-MM-dd to yy/MM/dd format for NetSuite
   */
  private formatDateForNetSuite(dateStr: string): string {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2); // Get 2-digit year
    return `${year}/${month}/${day}`;
  }

  /**
   * Fetch customer payments with optional date filter
   */
  async fetchCustomerPayments(dateFrom?: string, dateTo?: string, limit: number = 1000, offset: number = 0): Promise<any> {
    // First, get the list of payment IDs
    const queryParams: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };

    // Build date query
    const dateConditions: string[] = [];
    if (dateFrom) {
      const formattedDateFrom = this.formatDateForNetSuite(dateFrom);
      dateConditions.push(`tranDate ON_OR_AFTER "${formattedDateFrom}"`);
    }
    if (dateTo) {
      const formattedDateTo = this.formatDateForNetSuite(dateTo);
      dateConditions.push(`tranDate ON_OR_BEFORE "${formattedDateTo}"`);
    }
    
    if (dateConditions.length > 0) {
      queryParams.q = dateConditions.join(" AND ");
    }

    const listResponse = await this.fetchData("customerpayment", queryParams);
    
    if (!listResponse.items || listResponse.items.length === 0) {
      return { items: [] };
    }

    // Then fetch full details for each payment sequentially to avoid concurrency limits
    console.log(`🔍 [NetSuite] Fetching details for ${listResponse.items.length} payments...`);
    const detailedPayments = [];
    
    for (let i = 0; i < listResponse.items.length; i++) {
      const item = listResponse.items[i];
      try {
        // Find the self link (like the Python code does)
        const selfLink = item.links?.find((link: any) => link.rel === 'self')?.href;
        if (!selfLink) {
          console.error(`❌ [NetSuite] No self link found for payment ${item.id}`);
          detailedPayments.push(item);
          continue;
        }
        
        // Progress indicator every 5 payments (more frequent for smaller datasets)
        if ((i + 1) % 5 === 0 || i === 0) {
          console.log(`🔍 [NetSuite] Progress: ${i + 1}/${listResponse.items.length} payments processed`);
        }
        
        const details = await this.fetchRecordDetailsBySelfLink(selfLink);
        
        // Fetch apply relationships for this payment
        const applyRelationships = await this.fetchPaymentApplyRelationships(details);
        details.applyRelationships = applyRelationships;
        
        detailedPayments.push(details);
        
        // Add a minimal delay to avoid hitting rate limits (optimized for speed)
        if (i < listResponse.items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay (optimized for speed)
        }
      } catch (error) {
        console.error(`❌ [NetSuite] Failed to fetch details for payment ${item.id}:`, error);
        detailedPayments.push(item); // Return the basic item if details fetch fails
      }
    }

    return { items: detailedPayments };
  }

  /**
   * Fetch apply relationships for a payment (which invoices it applies to)
   */
  async fetchPaymentApplyRelationships(payment: any): Promise<any[]> {
    try {
      // Check if the payment has apply relationships
      const applyLink = payment.apply?.links?.find((link: any) => link.rel === 'self')?.href;
      if (!applyLink) {
        console.log(`🔍 [NetSuite] No apply relationships found for payment ${payment.id}`);
        return [];
      }

      // Fetch the apply relationships
      const applyResponse = await this.fetchRecordDetailsBySelfLink(applyLink);
      const applyItems = applyResponse.items || [];
      
      console.log(`🔍 [NetSuite] Found ${applyItems.length} apply relationships for payment ${payment.id}`);
      
      const applyRelationships = [];
      
      for (const applyItem of applyItems) {
        try {
          // Get the apply detail link
          const applyDetailLink = applyItem.links?.[0]?.href;
          if (!applyDetailLink) {
            console.warn(`⚠️ [NetSuite] No apply detail link found for apply item`);
            continue;
          }
          
          // Fetch the apply detail
          const applyDetail = await this.fetchRecordDetailsBySelfLink(applyDetailLink);
          
          if (applyDetail.apply) {
            applyRelationships.push({
              invoiceNumber: applyDetail.refNum,
              applyDate: applyDetail.applyDate,
              applyAmount: applyDetail.amount,
              invoiceId: applyDetail.doc?.id?.toString() || applyDetail.doc?.toString(), // Extract ID from doc object
              paymentId: payment.id,
              paymentNumber: payment.tranId,
              paymentDate: payment.tranDate,
              paymentAmount: payment.total,
              paymentCustomer: payment.customer?.refName,
              invoiceCustomer: applyDetail.entity?.refName
            });
          }
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 25));
          
        } catch (error) {
          console.error(`❌ [NetSuite] Failed to fetch apply detail:`, error);
        }
      }
      
      return applyRelationships;
      
    } catch (error) {
      console.error(`❌ [NetSuite] Failed to fetch apply relationships for payment ${payment.id}:`, error);
      return [];
    }
  }

  /**
   * Fetch individual record details using the self link (like the Python code)
   */
  async fetchRecordDetailsBySelfLink(selfLink: string, retryCount: number = 0): Promise<any> {
    // Parse the URL to get the base URL and query parameters
    const url = new URL(selfLink);
    const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
    
    // Add expandSubResources parameter to get line items for invoices
    const queryParams: Record<string, string> = {};
    if (url.pathname.includes('/invoice/')) {
      queryParams.expandSubResources = 'true';
    }
    
    // Add existing query parameters
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Add new query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    // Generate OAuth header using base URL but include query params in signature
    const authHeader = this.generateOAuthHeader(baseUrl, "GET", queryParams);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`⏳ [NetSuite] Rate limited for record, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchRecordDetailsBySelfLink(selfLink, retryCount + 1);
      }
      
      throw new Error(`NetSuite API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Fetch invoices with optional date filter
   */
  async fetchInvoices(dateFrom?: string, dateTo?: string, limit: number = 1000, offset: number = 0): Promise<any> {
    // First, get the list of invoice IDs
    const queryParams: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };

    // Build date query
    const dateConditions: string[] = [];
    if (dateFrom) {
      const formattedDateFrom = this.formatDateForNetSuite(dateFrom);
      dateConditions.push(`tranDate ON_OR_AFTER "${formattedDateFrom}"`);
    }
    if (dateTo) {
      const formattedDateTo = this.formatDateForNetSuite(dateTo);
      dateConditions.push(`tranDate ON_OR_BEFORE "${formattedDateTo}"`);
    }
    
    if (dateConditions.length > 0) {
      queryParams.q = dateConditions.join(" AND ");
    }

    const listResponse = await this.fetchData("invoice", queryParams);
    
    if (!listResponse.items || listResponse.items.length === 0) {
      return { items: [] };
    }

    // Then fetch full details for each invoice sequentially to avoid concurrency limits
    console.log(`🔍 [NetSuite] Fetching details for ${listResponse.items.length} invoices...`);
    const detailedInvoices = [];
    
    for (let i = 0; i < listResponse.items.length; i++) {
      const item = listResponse.items[i];
      try {
        // Find the self link (like the Python code does)
        const selfLink = item.links?.find((link: any) => link.rel === 'self')?.href;
        if (!selfLink) {
          console.error(`❌ [NetSuite] No self link found for invoice ${item.id}`);
          detailedInvoices.push(item);
          continue;
        }
        
        // Progress indicator every 5 invoices for better visibility
        if ((i + 1) % 5 === 0 || i === 0) {
          console.log(`🔍 [NetSuite] Progress: ${i + 1}/${listResponse.items.length} invoices processed`);
        }
        
        const details = await this.fetchRecordDetailsBySelfLink(selfLink);
        detailedInvoices.push(details);
        
        // Reduced delay to speed up processing
        if (i < listResponse.items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay for faster processing
        }
      } catch (error) {
        console.error(`❌ [NetSuite] Failed to fetch details for invoice ${item.id}:`, error);
        detailedInvoices.push(item); // Return the basic item if details fetch fails
      }
    }

    return { items: detailedInvoices };
  }

  /**
   * Fetch credit memos with optional date filter
   */
  async fetchCreditMemos(dateFrom?: string, dateTo?: string, limit: number = 1000, offset: number = 0): Promise<any> {
    // First, get the list of credit memo IDs
    const queryParams: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };

    // Build date query
    const dateConditions: string[] = [];
    if (dateFrom) {
      const formattedDateFrom = this.formatDateForNetSuite(dateFrom);
      dateConditions.push(`tranDate ON_OR_AFTER "${formattedDateFrom}"`);
    }
    if (dateTo) {
      const formattedDateTo = this.formatDateForNetSuite(dateTo);
      dateConditions.push(`tranDate ON_OR_BEFORE "${formattedDateTo}"`);
    }
    
    if (dateConditions.length > 0) {
      queryParams.q = dateConditions.join(" AND ");
    }

    const listResponse = await this.fetchData("creditmemo", queryParams);
    
    if (!listResponse.items || listResponse.items.length === 0) {
      return { items: [] };
    }

    // Then fetch full details for each credit memo sequentially to avoid concurrency limits
    console.log(`🔍 [NetSuite] Fetching details for ${listResponse.items.length} credit memos...`);
    const detailedCreditMemos = [];
    
    for (let i = 0; i < listResponse.items.length; i++) {
      const item = listResponse.items[i];
      try {
        // Find the self link (like the Python code does)
        const selfLink = item.links?.find((link: any) => link.rel === 'self')?.href;
        if (!selfLink) {
          console.error(`❌ [NetSuite] No self link found for credit memo ${item.id}`);
          detailedCreditMemos.push(item);
          continue;
        }
        
        // Progress indicator every 5 credit memos for better visibility
        if ((i + 1) % 5 === 0 || i === 0) {
          console.log(`🔍 [NetSuite] Progress: ${i + 1}/${listResponse.items.length} credit memos processed`);
        }
        
        const details = await this.fetchRecordDetailsBySelfLink(selfLink);
        detailedCreditMemos.push(details);
        
        // Reduced delay to speed up processing
        if (i < listResponse.items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay for faster processing
        }
      } catch (error) {
        console.error(`❌ [NetSuite] Failed to fetch details for credit memo ${item.id}:`, error);
        detailedCreditMemos.push(item); // Return the basic item if details fetch fails
      }
    }

    return { items: detailedCreditMemos };
  }
}

// Export a singleton instance
export const netSuiteClient = new NetSuiteClient();
