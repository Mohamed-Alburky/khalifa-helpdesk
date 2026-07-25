import xmlrpc from 'xmlrpc';

/**
 * Odoo Service Configuration Interface
 */
export interface OdooConfig {
  url: string;        // e.g. 'https://edu-training1229.odoo.com'
  db: string;         // Odoo database name (for Odoo Online SaaS, usually the subdomain 'edu-training1229')
  username: string;   // Odoo login email (e.g., user@example.com)
  password: string;   // Odoo API Key generated from My Profile > Account Security > New API Key
}

/**
 * Service to handle XML-RPC communication with an Odoo ERP Online (SaaS) or On-Premise instance.
 */
export class OdooService {
  private config: OdooConfig;
  private uid: number | null = null;
  private host: string;
  private port: number;
  private isSecure: boolean;

  constructor(config?: Partial<OdooConfig>) {
    this.config = {
      url: config?.url || process.env.ODOO_URL || 'https://edu-training1229.odoo.com',
      db: config?.db || process.env.ODOO_DB || 'edu-training1229',
      username: config?.username || process.env.ODOO_USERNAME || '',
      password: config?.password || process.env.ODOO_PASSWORD || '', // Use API Key
    };

    const parsedUrl = new URL(this.config.url);
    this.host = parsedUrl.hostname;
    // Odoo Online always uses standard HTTPS port 443
    this.port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === 'https:' ? 443 : 80);
    this.isSecure = parsedUrl.protocol === 'https:';
  }

  /**
   * Helper to create XML-RPC client for common or object endpoint
   */
  private createClient(path: string) {
    const options = {
      host: this.host,
      port: this.port,
      path: path,
    };
    return this.isSecure
      ? xmlrpc.createSecureClient(options)
      : xmlrpc.createClient(options);
  }

  /**
   * Authenticate with Odoo and obtain user ID (uid)
   */
  public async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    return new Promise((resolve, reject) => {
      const client = this.createClient('/xmlrpc/2/common');
      const params = [
        this.config.db,
        this.config.username,
        this.config.password,
        {}, // user agent / details
      ];

      client.methodCall('authenticate', params, (err: any, uid) => {
        if (err) {
          console.error('[Odoo Integration] Authentication failed:', err);
          return reject(new Error(`Odoo Auth Error: ${err.message || err}`));
        }
        if (!uid) {
          return reject(new Error('Odoo Auth Failed: Invalid credentials or database name'));
        }
        this.uid = uid as number;
        console.log(`[Odoo Integration] Successfully authenticated. User ID (uid): ${this.uid}`);
        resolve(this.uid);
      });
    });
  }

  /**
   * Generic low-level ORM method executor via execute_kw
   */
  public async executeKw<T = any>(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: Record<string, any> = {}
  ): Promise<T> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      const client = this.createClient('/xmlrpc/2/object');
      const params = [
        this.config.db,
        uid,
        this.config.password,
        model,
        method,
        args,
        kwargs,
      ];

      client.methodCall('execute_kw', params, (err: any, result) => {
        if (err) {
          console.error(`[Odoo Integration] Error executing ${method} on ${model}:`, err);
          return reject(new Error(`Odoo ORM Error (${model}.${method}): ${err.message || err}`));
        }
        resolve(result as T);
      });
    });
  }

  /**
   * 1. Create a new Helpdesk Ticket in Odoo
   * @param ticketData Information for the ticket
   * @returns Odoo Record ID (number)
   */
  public async createTicket(ticketData: {
    name: string;
    description?: string;
    partner_email?: string;
    priority?: string; // '0', '1', '2', '3'
    team_id?: number;
  }): Promise<number> {
    // Note: In standard Odoo Helpdesk Enterprise, model is 'helpdesk.ticket'.
    // In Odoo Community or CRM fallback, you can use 'crm.lead' or 'project.task'.
    const model = process.env.ODOO_TICKET_MODEL || 'helpdesk.ticket';

    const payload: Record<string, any> = {
      name: ticketData.name,
      description: ticketData.description || '',
    };

    if (ticketData.partner_email) {
      payload.email_from = ticketData.partner_email;
    }
    if (ticketData.priority) {
      payload.priority = ticketData.priority;
    }

    try {
      const odooId = await this.executeKw<number>(model, 'create', [[payload]]);
      console.log(`[Odoo Integration] Created Odoo Ticket ID #${odooId} in model '${model}'`);
      return odooId;
    } catch (err: any) {
      console.warn(`[Odoo Integration] Failed to create record in ${model}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Post a chatter message / note on a record in Odoo
   */
  public async postMessage(model: string, recordId: number, body: string): Promise<boolean> {
    try {
      await this.executeKw(model, 'message_post', [[recordId]], {
        body: body,
        message_type: 'comment',
        subtype_xmlid: 'mail.mt_note',
      });
      console.log(`[Odoo Integration] Posted chatter note on ${model} #${recordId}`);
      return true;
    } catch (err: any) {
      console.warn(`[Odoo Integration] Failed to post message to ${model} #${recordId}: ${err.message || err}`);
      return false;
    }
  }

  /**
   * 2. Update an existing Ticket's stage/status in Odoo with rich details
   * @param odooId Record ID in Odoo
   * @param status App status string ('pending' | 'active' | 'in_progress' | 'resolved' | 'closed')
   * @param extraDetails Optional additional info (engineer name, resolution notes, etc.)
   */
  public async updateTicketStatus(
    odooId: number,
    status: string,
    extraDetails?: {
      engineerName?: string;
      engineerEmail?: string;
      resolutionNotes?: string;
      ratingStars?: number;
      ratingComment?: string;
      assignedAt?: string;
    }
  ): Promise<boolean> {
    const model = process.env.ODOO_TICKET_MODEL || 'helpdesk.ticket';

    // Map custom app status to Odoo stage_id
    const stageMapping: Record<string, number> = {
      pending: 1,      // New / Open
      active: 2,       // In Progress
      in_progress: 2,  // In Progress
      resolved: 3,     // Solved / Done
      closed: 4,       // Closed / Done
    };

    const stageId = stageMapping[status] || 1;

    try {
      // 1. Update Odoo stage_id
      const success = await this.executeKw<boolean>(model, 'write', [
        [odooId],
        { stage_id: stageId },
      ]);
      console.log(`[Odoo Integration] Updated Ticket #${odooId} status to '${status}' (stage_id: ${stageId}): ${success}`);

      // 2. Post detailed updates to Odoo Chatter / Log
      let logText = `📌 [تحديث من نظام الدعم الفني] تغيرت حالة البطاقة إلى: ${status.toUpperCase()}`;

      if (status === 'active' && extraDetails?.engineerName) {
        logText = `👨‍💻 <b>تم استلام البطاقة وبدء المعالجة</b><br/><b>المستلم:</b> المهندس ${extraDetails.engineerName}${extraDetails.engineerEmail ? ` (${extraDetails.engineerEmail})` : ''}<br/><b>وقت الاستلام:</b> ${extraDetails.assignedAt || new Date().toLocaleString('ar-SA')}`;
      } else if (status === 'resolved') {
        logText = `✅ <b>تم إنجاز وحل التذكرة</b><br/><b>المهندس:</b> ${extraDetails?.engineerName || 'المختص'}<br/><b>ملاحظات الحل:</b> ${extraDetails?.resolutionNotes || 'تم حل المشكلة بنجاح'}`;
      } else if (status === 'closed' && extraDetails?.ratingStars) {
        logText = `⭐ <b>تقييم الخدمة وإغلاق التذكرة</b><br/><b>التقييم:</b> ${extraDetails.ratingStars} من 5 نجوم<br/><b>ملاحظات الموظف:</b> ${extraDetails.ratingComment || 'لا يوجد'}`;
      }

      await this.postMessage(model, odooId, logText);

      return success;
    } catch (err: any) {
      console.warn(`[Odoo Integration] Failed to update Odoo Ticket #${odooId}: ${err.message || err}`);
      return false;
    }
  }

  /**
   * Inspect model fields dynamically (useful for discovering field names & types)
   */
  public async getModelFields(model: string = 'helpdesk.ticket'): Promise<Record<string, any>> {
    return this.executeKw(model, 'fields_get', [], {
      attributes: ['string', 'help', 'type', 'required', 'readonly', 'selection'],
    });
  }
}

// Export singleton default instance for easy application usage
export const odooService = new OdooService();
