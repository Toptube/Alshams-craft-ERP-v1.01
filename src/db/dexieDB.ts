import Dexie, { type Table } from 'dexie';
import {
  UserProfile,
  SavedProductRecord,
  RawMaterialItem,
  InventoryTransaction,
  SupplierProfile,
  SupplierPurchaseInvoice,
  CustomerProfile,
  CustomerOrder,
  EmployeeProfile,
  EmployeePayoutRecord,
  SafeTransaction,
  AdminCostRecord,
  SystemActivityLog,
  SafeType,
  AuthUserRecord,
  NotificationItem,
} from '../types';

export interface AIKnowledgeItem {
  id: string;
  tenantId: string;
  category: string;
  overrideField: string;
  initialValue: number;
  overriddenValue: number;
  reason?: string;
  timestamp: number;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_alshams_craft_secret_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class AlShamsDatabase extends Dexie {
  profiles!: Table<UserProfile, string>;
  authUsers!: Table<AuthUserRecord, string>;
  notifications!: Table<NotificationItem, string>;
  products!: Table<SavedProductRecord, string>;
  rawMaterials!: Table<RawMaterialItem, string>;
  inventoryTransactions!: Table<InventoryTransaction, string>;
  suppliers!: Table<SupplierProfile, string>;
  supplierInvoices!: Table<SupplierPurchaseInvoice, string>;
  customers!: Table<CustomerProfile, string>;
  orders!: Table<CustomerOrder, string>;
  employees!: Table<EmployeeProfile, string>;
  employeePayouts!: Table<EmployeePayoutRecord, string>;
  safeTransactions!: Table<SafeTransaction, string>;
  adminExpenses!: Table<AdminCostRecord, string>;
  activityLogs!: Table<SystemActivityLog, string>;
  aiKnowledgeBase!: Table<AIKnowledgeItem, string>;

  constructor() {
    super('AlShamsCraftERP_DB_V2');
    this.version(2).stores({
      profiles: 'id, tenantId, email',
      authUsers: 'id, email, tenantId, createdAt',
      notifications: 'id, tenantId, type, isRead, createdAt',
      products: 'id, tenantId, category, productName, isActive, createdAt',
      rawMaterials: 'id, tenantId, category, materialName, isActive',
      inventoryTransactions: 'id, tenantId, itemId, type, date',
      suppliers: 'id, tenantId, name, phoneNumber',
      supplierInvoices: 'id, tenantId, supplierId, date',
      customers: 'id, tenantId, fullName, phoneNumber',
      orders: 'id, tenantId, customerId, status, date',
      employees: 'id, tenantId, fullName, tier, isActive',
      employeePayouts: 'id, tenantId, employeeId, date',
      safeTransactions: 'id, tenantId, safeType, type, date',
      adminExpenses: 'id, tenantId, category, month',
      activityLogs: 'id, tenantId, actionType, timestamp',
      aiKnowledgeBase: 'id, tenantId, category, overrideField, timestamp',
    });
  }
}

export const db = new AlShamsDatabase();

// Multi-Tenant Isolation Data Access Layer
export const tenantStorage = {
  // Profiles
  async getProfile(tenantId: string): Promise<UserProfile | undefined> {
    return db.profiles.where('tenantId').equals(tenantId).first();
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    await db.profiles.put(profile);
  },

  // Products Archive (Mutate / Overwrite when existing ID is given)
  async getProducts(tenantId: string, categoryFilter?: string, searchQuery?: string): Promise<SavedProductRecord[]> {
    let collection = db.products.where('tenantId').equals(tenantId);
    let items = await collection.reverse().sortBy('createdAt');

    items = items.filter((p) => p.isActive !== false);

    if (categoryFilter && categoryFilter !== 'all') {
      items = items.filter((p) => p.category === categoryFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter((p) => p.productName.toLowerCase().includes(q));
    }

    return items;
  },

  async getProductById(tenantId: string, id: string): Promise<SavedProductRecord | undefined> {
    const item = await db.products.get(id);
    if (item && item.tenantId === tenantId) {
      return item;
    }
    return undefined;
  },

  async mutateProduct(record: SavedProductRecord): Promise<void> {
    record.updatedAt = Date.now();
    record.isActive = record.isActive !== false;
    await db.products.put(record);
  },

  async deactivateProduct(tenantId: string, id: string, reason: string, userEmail: string): Promise<void> {
    const item = await db.products.get(id);
    if (item && item.tenantId === tenantId) {
      item.isActive = false;
      await db.products.put(item);

      // Log in System Activity Report
      await this.logActivity({
        id: 'act_' + Date.now(),
        tenantId,
        actionType: 'item_deactivated',
        entityType: 'order',
        entityId: id,
        entityName: item.productName,
        userEmail,
        reason: reason || 'تعطيل المنتج من قائمة العرض',
        authorizedByPassword: true,
        timestamp: Date.now(),
      });
    }
  },

  async deleteProduct(tenantId: string, id: string): Promise<void> {
    await this.deactivateProduct(tenantId, id, 'إلغاء أرشفة المنتج', 'artisan@alshams.craft');
  },

  async getInventory(tenantId: string): Promise<RawMaterialItem[]> {
    return this.getRawMaterials(tenantId);
  },

  async addInventoryItem(item: RawMaterialItem): Promise<void> {
    await this.saveRawMaterial(item);
  },

  async recordMaterialPurchase(
    tenantId: string,
    itemId: string,
    quantity: number,
    unitCost: number,
    supplierName: string,
    notes: string
  ): Promise<void> {
    const item = await db.rawMaterials.get(itemId);
    if (!item || item.tenantId !== tenantId) {
      throw new Error('الخامة غير موجودة في مخزن الورشة');
    }

    item.currentStock = Number((item.currentStock + quantity).toFixed(3));
    item.costPerUnit = unitCost;
    item.costPerGram = item.unit === 'كيلو' ? unitCost / 1000 : unitCost;
    item.supplierName = supplierName || item.supplierName;
    item.lastPurchaseDate = new Date().toISOString().split('T')[0];
    await db.rawMaterials.put(item);

    await db.inventoryTransactions.add({
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      tenantId,
      itemId,
      materialName: item.materialName,
      type: 'purchase_in',
      quantity,
      unitCost,
      totalCost: Math.round(quantity * unitCost),
      notes: notes || `شراء أصول خامات من المورد ${supplierName}`,
      date: new Date().toISOString().split('T')[0],
    });
  },

  async getInventoryTransactions(tenantId: string): Promise<InventoryTransaction[]> {
    return db.inventoryTransactions.where('tenantId').equals(tenantId).reverse().sortBy('date');
  },

  async deleteAdminCost(tenantId: string, id: string): Promise<void> {
    const item = await db.adminExpenses.get(id);
    if (item && item.tenantId === tenantId) {
      await db.adminExpenses.delete(id);
    }
  },

  async saveOrder(order: CustomerOrder): Promise<void> {
    await this.recordSalesOrder(order);
  },

  // RAW MATERIALS & STOCK CARDS (كروت الصنف والأصول)
  async getRawMaterials(tenantId: string, includeInactive = false): Promise<RawMaterialItem[]> {
    let items = await db.rawMaterials.where('tenantId').equals(tenantId).toArray();
    if (!includeInactive) {
      items = items.filter((i) => i.isActive !== false);
    }
    return items;
  },

  async saveRawMaterial(material: RawMaterialItem): Promise<void> {
    material.costPerGram = material.unit === 'كيلو' ? material.costPerUnit / 1000 : material.costPerUnit;
    material.isActive = material.isActive !== false;
    await db.rawMaterials.put(material);
  },

  async deactivateRawMaterial(tenantId: string, id: string, reason: string, userEmail: string): Promise<void> {
    const item = await db.rawMaterials.get(id);
    if (item && item.tenantId === tenantId) {
      item.isActive = false;
      await db.rawMaterials.put(item);

      await this.logActivity({
        id: 'act_' + Date.now(),
        tenantId,
        actionType: 'item_deactivated',
        entityType: 'material',
        entityId: id,
        entityName: item.materialName,
        userEmail,
        reason: reason || 'تعطيل خامة من القوائم النشطة',
        authorizedByPassword: true,
        timestamp: Date.now(),
      });
    }
  },

  // SUPPLIERS & INVOICES
  async getSuppliers(tenantId: string): Promise<SupplierProfile[]> {
    return db.suppliers.where('tenantId').equals(tenantId).toArray();
  },

  async saveSupplier(supplier: SupplierProfile): Promise<void> {
    await db.suppliers.put(supplier);
  },

  async recordSupplierPurchaseInvoice(invoice: SupplierPurchaseInvoice): Promise<void> {
    await db.supplierInvoices.put(invoice);

    // Update material stocks & unit prices dynamically
    for (const line of invoice.items) {
      let material = await db.rawMaterials.get(line.materialId);
      if (material && material.tenantId === invoice.tenantId) {
        material.currentStock = Number((material.currentStock + line.quantity).toFixed(3));
        material.costPerUnit = line.unitCost;
        material.costPerGram = material.unit === 'كيلو' ? line.unitCost / 1000 : line.unitCost;
        material.lastPurchaseDate = invoice.date;
        material.supplierId = invoice.supplierId;
        material.supplierName = invoice.supplierName;
        await db.rawMaterials.put(material);

        // Inventory log
        await db.inventoryTransactions.add({
          id: 'tx_' + Math.random().toString(36).substring(2, 9),
          tenantId: invoice.tenantId,
          itemId: material.id,
          materialName: material.materialName,
          type: 'purchase_in',
          quantity: line.quantity,
          unitCost: line.unitCost,
          totalCost: line.totalCost,
          notes: `فاتورة مشتريات رقم #${invoice.invoiceNumber || invoice.id.slice(-4)} من ${invoice.supplierName}`,
          date: invoice.date,
        });
      }
    }

    // Update supplier balance
    const supplier = await db.suppliers.get(invoice.supplierId);
    if (supplier && supplier.tenantId === invoice.tenantId) {
      supplier.totalPurchases += invoice.totalAmount;
      supplier.totalPaid += invoice.paidAmount;
      supplier.outstandingBalance = Math.max(0, supplier.totalPurchases - supplier.totalPaid);
      await db.suppliers.put(supplier);
    }

    // Deduct paid amount from selected Safe
    if (invoice.paidAmount > 0) {
      await this.recordSafeTransaction({
        id: 'stx_' + Date.now(),
        tenantId: invoice.tenantId,
        safeType: invoice.safeType || 'main',
        type: 'expense_purchase',
        amount: -invoice.paidAmount,
        balanceAfter: 0, // computed in recordSafeTransaction
        description: `سداد فاتورة مشتريات خامات للمورد: ${invoice.supplierName}`,
        relatedId: invoice.id,
        date: invoice.date,
        createdAt: Date.now(),
      });
    }
  },

  async getSupplierInvoices(tenantId: string, supplierId?: string): Promise<SupplierPurchaseInvoice[]> {
    let collection = db.supplierInvoices.where('tenantId').equals(tenantId);
    let items = await collection.reverse().sortBy('date');
    if (supplierId) {
      items = items.filter((inv) => inv.supplierId === supplierId);
    }
    return items;
  },

  // CUSTOMERS & SALES ORDERS
  async getCustomers(tenantId: string): Promise<CustomerProfile[]> {
    return db.customers.where('tenantId').equals(tenantId).toArray();
  },

  async saveCustomer(customer: CustomerProfile): Promise<void> {
    await db.customers.put(customer);
  },

  async getOrders(tenantId: string): Promise<CustomerOrder[]> {
    return db.orders.where('tenantId').equals(tenantId).reverse().sortBy('date');
  },

  async recordSalesOrder(order: CustomerOrder): Promise<void> {
    await db.orders.put(order);

    // Update customer stats
    const customer = await db.customers.get(order.customerId);
    if (customer && customer.tenantId === order.tenantId) {
      const orders = await db.orders.where('customerId').equals(order.customerId).toArray();
      const totalPurchases = orders.reduce((sum, o) => sum + (o.finalTotal || 0), 0);
      const totalPaid = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
      customer.totalPurchases = totalPurchases;
      customer.outstandingBalance = Math.max(0, totalPurchases - totalPaid);
      await db.customers.put(customer);
    }

    // Deposit received amount into chosen safe
    if (order.amountPaid > 0) {
      await this.recordSafeTransaction({
        id: 'stx_' + Date.now(),
        tenantId: order.tenantId,
        safeType: order.safeType || 'main',
        type: 'income_sale',
        amount: order.amountPaid,
        balanceAfter: 0,
        description: `تحصيل مبيعات طلبية #${order.id.slice(-4)} للعميل: ${order.customerName}`,
        relatedId: order.id,
        date: order.date,
        createdAt: Date.now(),
      });
    }

    // If employee was assigned with piece-rate wage, credit their balance
    if (order.assignedEmployeeId && order.assignedEmployeeWage && order.assignedEmployeeWage > 0) {
      const employee = await db.employees.get(order.assignedEmployeeId);
      if (employee && employee.tenantId === order.tenantId) {
        employee.totalEarned += order.assignedEmployeeWage;
        employee.currentBalance += order.assignedEmployeeWage;
        await db.employees.put(employee);
      }
    }
  },

  // HR WORKFORCE & PAYROLL
  async getEmployees(tenantId: string): Promise<EmployeeProfile[]> {
    return db.employees.where('tenantId').equals(tenantId).toArray();
  },

  async saveEmployee(employee: EmployeeProfile): Promise<void> {
    employee.isActive = employee.isActive !== false;
    await db.employees.put(employee);
  },

  async recordEmployeePayout(payout: EmployeePayoutRecord): Promise<void> {
    payout.registeredAsOperatingExpense = true;
    await db.employeePayouts.put(payout);

    // Update employee balance
    const employee = await db.employees.get(payout.employeeId);
    if (employee && employee.tenantId === payout.tenantId) {
      employee.totalPaid += payout.amount;
      employee.currentBalance = Math.max(0, employee.totalEarned - employee.totalPaid);
      await db.employees.put(employee);
    }

    // Record as operating expense in designated Safe
    await this.recordSafeTransaction({
      id: 'stx_' + Date.now(),
      tenantId: payout.tenantId,
      safeType: payout.safeType || 'main',
      type: 'expense_payroll',
      amount: -payout.amount,
      balanceAfter: 0,
      description: `صرف ${payout.type === 'advance' ? 'سلفة' : 'أجر/مصنعية'} للموظف: ${payout.employeeName}`,
      relatedId: payout.id,
      date: payout.date,
      createdAt: Date.now(),
    });
  },

  async getEmployeePayouts(tenantId: string, employeeId?: string): Promise<EmployeePayoutRecord[]> {
    let items = await db.employeePayouts.where('tenantId').equals(tenantId).reverse().sortBy('date');
    if (employeeId) {
      items = items.filter((p) => p.employeeId === employeeId);
    }
    return items;
  },

  // SAFES & CASH BALANCES
  async getSafeBalances(tenantId: string): Promise<{ mainSafe: number; subSafe: number }> {
    const txs = await db.safeTransactions.where('tenantId').equals(tenantId).toArray();
    let mainSafe = 5000; // initial baseline safe balance
    let subSafe = 1500;

    for (const t of txs) {
      if (t.safeType === 'main') {
        mainSafe += t.amount;
      } else if (t.safeType === 'sub') {
        subSafe += t.amount;
      }
    }
    return { mainSafe, subSafe };
  },

  async recordSafeTransaction(tx: SafeTransaction): Promise<void> {
    const balances = await this.getSafeBalances(tx.tenantId);
    const current = tx.safeType === 'main' ? balances.mainSafe : balances.subSafe;
    tx.balanceAfter = current + tx.amount;
    await db.safeTransactions.put(tx);
  },

  async getSafeTransactions(tenantId: string, safeType?: SafeType): Promise<SafeTransaction[]> {
    let txs = await db.safeTransactions.where('tenantId').equals(tenantId).reverse().sortBy('createdAt');
    if (safeType) {
      txs = txs.filter((t) => t.safeType === safeType);
    }
    return txs;
  },

  // CONSOLIDATED ADMIN COSTS
  async getAdminCosts(tenantId: string, monthFilter?: string): Promise<AdminCostRecord[]> {
    let items = await db.adminExpenses.where('tenantId').equals(tenantId).toArray();
    if (monthFilter) {
      items = items.filter((x) => x.month === monthFilter);
    }
    return items.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  },

  async addAdminCost(cost: AdminCostRecord): Promise<void> {
    await db.adminExpenses.put(cost);

    // Deduct from safe
    await this.recordSafeTransaction({
      id: 'stx_' + Date.now(),
      tenantId: cost.tenantId,
      safeType: cost.safeType || 'main',
      type: 'expense_admin',
      amount: -cost.amount,
      balanceAfter: 0,
      description: `مصروف إداري: ${cost.title}`,
      relatedId: cost.id,
      date: cost.paymentDate,
      createdAt: Date.now(),
    });
  },

  // SYSTEM ACTIVITY AUDIT LOGS (تقرير حركة المنظومة)
  async logActivity(log: SystemActivityLog): Promise<void> {
    await db.activityLogs.put(log);
  },

  async getActivityLogs(tenantId: string): Promise<SystemActivityLog[]> {
    return db.activityLogs.where('tenantId').equals(tenantId).reverse().sortBy('timestamp');
  },

  // GENUINE AUTHENTICATION GATEWAY & VERIFICATION
  async seedDemoAuthIfEmpty(): Promise<void> {
    const count = await db.authUsers.count();
    if (count > 0) return;

    const demoPasswordHash = await hashPassword('123456');
    await db.authUsers.put({
      id: 'auth_demo_1',
      email: 'artisan@alshams.craft',
      passwordHash: demoPasswordHash,
      tenantId: 'tenant_demo_artisan_sara',
      brandName: 'شمس آرت للمكرمية اليدوية',
      artistName: 'سارة عبد الرحمن',
      createdAt: Date.now(),
    });

    await db.authUsers.put({
      id: 'auth_demo_2',
      email: 'sara@alshams.craft',
      passwordHash: demoPasswordHash,
      tenantId: 'tenant_demo_artisan_sara',
      brandName: 'شمس آرت للمكرمية اليدوية',
      artistName: 'سارة عبد الرحمن',
      createdAt: Date.now(),
    });
  },

  async registerAuthUser(params: {
    email: string;
    password: string;
    brandName: string;
    artistName: string;
    gender: 'male' | 'female';
    country: string;
    callingCode: string;
    currency: string;
    currencySymbol: string;
    phoneNumber: string;
    logoUrl?: string;
  }): Promise<UserProfile> {
    const cleanEmail = params.email.toLowerCase().trim();
    const existing = await db.authUsers.where('email').equals(cleanEmail).first();
    if (existing) {
      throw new Error('البريد الإلكتروني مسجل بالفعل بالمنظومة، يرجى التوجه لتسجيل الدخول.');
    }

    const passwordHash = await hashPassword(params.password);
    const safeTenant = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const tenantId = `tenant_${safeTenant}`;

    const authRecord: AuthUserRecord = {
      id: `auth_${Date.now()}`,
      email: cleanEmail,
      passwordHash,
      tenantId,
      brandName: params.brandName.trim(),
      artistName: params.artistName.trim(),
      createdAt: Date.now(),
    };
    await db.authUsers.put(authRecord);

    const profile: UserProfile = {
      id: `usr_${Date.now()}`,
      tenantId,
      email: cleanEmail,
      brandName: params.brandName.trim(),
      artistName: params.artistName.trim(),
      logoUrl: params.logoUrl,
      gender: params.gender,
      country: params.country,
      callingCode: params.callingCode,
      currency: params.currency,
      currencySymbol: params.currencySymbol,
      phoneNumber: params.phoneNumber.trim(),
      accountPasswordHash: passwordHash,
      socials: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.profiles.put(profile);
    await this.seedDemoDataIfEmpty(tenantId);
    return profile;
  },

  async loginAuthUser(emailInput: string, passwordInput: string): Promise<UserProfile> {
    await this.seedDemoAuthIfEmpty();
    const cleanEmail = emailInput.toLowerCase().trim();
    const authRecord = await db.authUsers.where('email').equals(cleanEmail).first();

    if (!authRecord) {
      throw new Error('البريد الإلكتروني غير مسجل بالمنظومة! يرجى إنشاء حساب جديد أولاً.');
    }

    const inputHash = await hashPassword(passwordInput);
    if (inputHash !== authRecord.passwordHash) {
      throw new Error('كلمة المرور غير صحيحة، يرجى التأكد من كلمة المرور وإعادة المحاولة.');
    }

    let profile = await this.getProfile(authRecord.tenantId);
    if (!profile) {
      profile = {
        id: `usr_${Date.now()}`,
        tenantId: authRecord.tenantId,
        email: cleanEmail,
        brandName: authRecord.brandName,
        artistName: authRecord.artistName,
        gender: 'female',
        country: 'جمهورية مصر العربية',
        callingCode: '+20',
        currency: 'EGP',
        currencySymbol: 'جنيه',
        phoneNumber: '01000000000',
        accountPasswordHash: authRecord.passwordHash,
        socials: {},
        createdAt: authRecord.createdAt,
        updatedAt: Date.now(),
      };
      await db.profiles.put(profile);
    }
    return profile;
  },

  // STRICT PASSWORD VERIFICATION
  async verifyPassword(tenantId: string, passwordInput: string): Promise<boolean> {
    const inputHash = await hashPassword(passwordInput);
    const authRecord = await db.authUsers.where('tenantId').equals(tenantId).first();
    if (authRecord) {
      return inputHash === authRecord.passwordHash;
    }

    const profile = await this.getProfile(tenantId);
    if (profile && profile.accountPasswordHash) {
      return inputHash === profile.accountPasswordHash || passwordInput === profile.accountPasswordHash;
    }
    return false;
  },

  // SECURE FACTORY RESET - PURGES ALL TABLES TO ABSOLUTE ZERO
  async wipeDatabaseWithAuth(tenantId: string, passwordInput: string, reason: string, userEmail: string): Promise<void> {
    const isValid = await this.verifyPassword(tenantId, passwordInput);
    if (!isValid) {
      throw new Error('كلمة المرور غير صحيحة! تم منع تصفير قاعدة البيانات لحماية أصول الورشة.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('يرجى كتابة سبب معتمد وموثق لطلب تصفير البيانات.');
    }

    // 1. Log the reset action before clearing
    await this.logActivity({
      id: 'act_' + Date.now(),
      tenantId,
      actionType: 'db_reset_attempt',
      entityType: 'database',
      entityId: 'all_tables',
      entityName: 'تصفير شامل لقاعدة البيانات',
      userEmail,
      reason,
      authorizedByPassword: true,
      timestamp: Date.now(),
      details: 'تم تفريغ كافة الجداول الحرفية (أصول، مبيعات، عملاء، موردين، عمالة) والعودة لنقطة الصفر المطلق',
    });

    // 2. PURGE ALL REVENUES, EXPENSES, CUSTOMERS, SUPPLIERS, MATERIAL INVENTORIES, EMPLOYEES & NOTIFICATIONS
    await db.orders.where('tenantId').equals(tenantId).delete();
    await db.rawMaterials.where('tenantId').equals(tenantId).delete();
    await db.inventoryTransactions.where('tenantId').equals(tenantId).delete();
    await db.suppliers.where('tenantId').equals(tenantId).delete();
    await db.supplierInvoices.where('tenantId').equals(tenantId).delete();
    await db.customers.where('tenantId').equals(tenantId).delete();
    await db.employees.where('tenantId').equals(tenantId).delete();
    await db.employeePayouts.where('tenantId').equals(tenantId).delete();
    await db.safeTransactions.where('tenantId').equals(tenantId).delete();
    await db.adminExpenses.where('tenantId').equals(tenantId).delete();
    await db.products.where('tenantId').equals(tenantId).delete();
    await db.notifications.where('tenantId').equals(tenantId).delete();
    await db.aiKnowledgeBase.where('tenantId').equals(tenantId).delete();
  },

  // NOTIFICATIONS ENGINE
  async getNotifications(tenantId: string): Promise<NotificationItem[]> {
    return db.notifications.where('tenantId').equals(tenantId).reverse().sortBy('createdAt');
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const item = await db.notifications.get(id);
    if (item) {
      item.isRead = true;
      await db.notifications.put(item);
    }
  },

  async markAllNotificationsAsRead(tenantId: string): Promise<void> {
    const items = await db.notifications.where('tenantId').equals(tenantId).toArray();
    for (const item of items) {
      item.isRead = true;
      await db.notifications.put(item);
    }
  },

  async updateOrderStatus(tenantId: string, orderId: string, newStatus: any): Promise<void> {
    const order = await db.orders.get(orderId);
    if (order && order.tenantId === tenantId) {
      order.status = newStatus;
      await db.orders.put(order);

      // Log status change
      await this.logActivity({
        id: 'act_' + Date.now(),
        tenantId,
        actionType: 'price_recalibration',
        entityType: 'order',
        entityId: orderId,
        entityName: `تحديث حالة الطلبية #${orderId.slice(-4)} إلى ${newStatus}`,
        userEmail: 'system',
        reason: 'تحديث حالة التنفيذ من جرس الإشعارات',
        authorizedByPassword: true,
        timestamp: Date.now(),
      });
    }
  },

  async generateProactiveNotifications(tenantId: string): Promise<void> {
    try {
      const now = Date.now();
      const existingNotifs = await db.notifications.where('tenantId').equals(tenantId).toArray();
      const existingTitles = new Set(existingNotifs.map((n) => n.title));

      // 1. Stock Depletion Alerts (تنبيهات نفاد المخزن)
      const materials = await this.getRawMaterials(tenantId);
      for (const mat of materials) {
        if (mat.currentStock <= mat.minAlertThreshold) {
          const title = `⚠️ نفاد المخزن: خامة "${mat.materialName}"`;
          if (!existingTitles.has(title)) {
            await db.notifications.put({
              id: 'notif_stock_' + mat.id + '_' + Math.floor(now / (86400000 * 2)),
              tenantId,
              type: 'stock_depletion',
              title,
              message: `الرصيد المتبقي (${mat.currentStock} ${mat.unit}) وصل أو قل عن حد الأمان (${mat.minAlertThreshold} ${mat.unit}). يرجى إصدار أمر توريد.`,
              isRead: false,
              relatedItemId: mat.id,
              createdAt: now,
            });
          }
        }
      }

      // 2. Upcoming Deliveries & 2-Day Reminders
      const orders = await this.getOrders(tenantId);
      for (const ord of orders) {
        if (ord.deliveryDate && ord.status !== 'delivered') {
          const targetTime = new Date(ord.deliveryDate).getTime();
          const diffDays = Math.ceil((targetTime - now) / 86400000);

          if (diffDays >= 0 && diffDays <= 2) {
            const title = `⏰ موعد تسليم قريب: طلبية ${ord.customerName}`;
            if (!existingTitles.has(title)) {
              await db.notifications.put({
                id: 'notif_deliv_' + ord.id,
                tenantId,
                type: 'upcoming_delivery',
                title,
                message: `متبقي ${diffDays === 0 ? 'اليوم فقط' : diffDays + ' يوم'} على موعد تسليم طلبية "${ord.productName || 'المكرمية'}" للعميل ${ord.customerName}.`,
                isRead: false,
                relatedOrderId: ord.id,
                createdAt: now,
              });
            }
          } else if (diffDays < 0) {
            const title = `🚨 تأخير موعد تسليم: طلبية ${ord.customerName}`;
            if (!existingTitles.has(title)) {
              await db.notifications.put({
                id: 'notif_overdue_' + ord.id,
                tenantId,
                type: 'upcoming_delivery',
                title,
                message: `تجاوزت الطلبية موعد التسليم المحدد (${ord.deliveryDate}). يرجى متابعة الشحن والتسليم.`,
                isRead: false,
                relatedOrderId: ord.id,
                createdAt: now,
              });
            }
          }
        }

        // 3. Tri-Phase Deposit Reminders
        if (ord.depositPhases) {
          const phases = [
            { num: 1, amount: ord.depositPhases.phase1Amount, date: ord.depositPhases.phase1Date, paid: ord.depositPhases.phase1Paid },
            { num: 2, amount: ord.depositPhases.phase2Amount, date: ord.depositPhases.phase2Date, paid: ord.depositPhases.phase2Paid },
            { num: 3, amount: ord.depositPhases.phase3Amount, date: ord.depositPhases.phase3Date, paid: ord.depositPhases.phase3Paid },
          ];

          for (const ph of phases) {
            if (ph.amount > 0 && !ph.paid && ph.date) {
              const targetTime = new Date(ph.date).getTime();
              const diffDays = Math.ceil((targetTime - now) / 86400000);

              if (diffDays <= 2) {
                const title = `💰 استحقاق دفعة (${ph.num}): عميل ${ord.customerName}`;
                if (!existingTitles.has(title)) {
                  await db.notifications.put({
                    id: 'notif_phase_' + ord.id + '_' + ph.num,
                    tenantId,
                    type: 'upcoming_deposit',
                    title,
                    message: `موعد تحصيل الدفعة رقم (${ph.num}) بقيمة ${ph.amount} جنيه للعميل ${ord.customerName} مستحقة بتاريخ ${ph.date}.`,
                    isRead: false,
                    relatedOrderId: ord.id,
                    createdAt: now,
                  });
                }
              }
            }
          }
        }
      }

      // 4. Peak Performance Milestones (أكبر نسبة مبيعات يومياً)
      const totalPaidOrders = orders.filter((o) => o.amountPaid > 0);
      if (totalPaidOrders.length >= 3) {
        const title = `🏆 إنجاز ورشة: نشاط مبيعات متميز اليوم!`;
        if (!existingTitles.has(title)) {
          await db.notifications.put({
            id: 'notif_milestone_' + Math.floor(now / 86400000),
            tenantId,
            type: 'milestone_sales',
            title,
            message: `تهانينا! حققت الورشة أعلى وتيرة تسجيل طلبيات ومبيعات اليوم. استمر في التميز والإبداع!`,
            isRead: false,
            createdAt: now,
          });
        }
      }
    } catch (err) {
      console.error('Notification generator error:', err);
    }
  },

  // LOCAL AI OVERRIDES
  async logArtisanOverride(knowledge: AIKnowledgeItem): Promise<void> {
    await db.aiKnowledgeBase.put(knowledge);
  },

  async getArtisanOverrides(tenantId: string): Promise<AIKnowledgeItem[]> {
    return db.aiKnowledgeBase.where('tenantId').equals(tenantId).reverse().sortBy('timestamp');
  },

  // DEMO SEED
  async seedDemoDataIfEmpty(tenantId: string): Promise<void> {
    const existing = await db.rawMaterials.where('tenantId').equals(tenantId).count();
    if (existing > 0) return;

    // Seed raw materials
    const sampleMaterials: RawMaterialItem[] = [
      {
        id: 'mat_1',
        tenantId,
        materialName: 'خيط قطن مجدول 4 مم طبيعي',
        category: 'خيوط',
        unit: 'كيلو',
        currentStock: 25.0,
        costPerUnit: 180,
        costPerGram: 0.18,
        supplierName: 'مغزل المحلة الكبرى',
        warehouseLocation: 'المخزن الرئيسي - رف أ1',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: 5,
        isActive: true,
      },
      {
        id: 'mat_2',
        tenantId,
        materialName: 'خيط قطن محلول 4 مم سوفت',
        category: 'خيوط',
        unit: 'كيلو',
        currentStock: 15.0,
        costPerUnit: 160,
        costPerGram: 0.16,
        supplierName: 'مؤسسة النساجون اليدويون',
        warehouseLocation: 'المخزن الرئيسي - رف أ2',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: 4,
        isActive: true,
      },
      {
        id: 'mat_3',
        tenantId,
        materialName: 'عصا زان معالجة 70 سم',
        category: 'أخشاب وشاسيهات',
        unit: 'قطعة',
        currentStock: 30,
        costPerUnit: 45,
        costPerGram: 45,
        supplierName: 'نجارة الفنون الطبيعية',
        warehouseLocation: 'المخزن - قسم الأخشاب',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: 8,
        isActive: true,
      },
      {
        id: 'mat_4',
        tenantId,
        materialName: 'خرز خشبي طبيعي معالج 20 مم',
        category: 'إكسسوارات ومعادن',
        unit: 'قطعة',
        currentStock: 200,
        costPerUnit: 2.5,
        costPerGram: 2.5,
        supplierName: 'معادن وأخشاب خان الخليلي',
        warehouseLocation: 'صندوق الإكسسوارات',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: 30,
        isActive: true,
      },
      {
        id: 'mat_5',
        tenantId,
        materialName: 'حلقات معدنية ذهبية 5 سم',
        category: 'إكسسوارات ومعادن',
        unit: 'قطعة',
        currentStock: 80,
        costPerUnit: 8,
        costPerGram: 8,
        supplierName: 'معادن خان الخليلي',
        warehouseLocation: 'صندوق الإكسسوارات',
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        minAlertThreshold: 15,
        isActive: true,
      },
    ];

    for (const m of sampleMaterials) {
      await db.rawMaterials.put(m);
    }

    // Seed supplier
    await db.suppliers.put({
      id: 'sup_1',
      tenantId,
      name: 'الحاج إبراهيم الشناوي',
      companyName: 'مغزل المحلة للأقطان التصديرية',
      phoneNumber: '01012345678',
      address: 'المحلة الكبرى - شارع الإنتاج',
      totalPurchases: 4500,
      totalPaid: 3500,
      outstandingBalance: 1000,
      notes: 'مورد معتمد لخيوط القطن الفاخر درجة أولى',
      createdAt: Date.now() - 86400000 * 30,
    });

    // Seed HR employees
    await db.employees.put({
      id: 'emp_1',
      tenantId,
      fullName: 'مريم الدسوقي',
      specialty: 'حياكة مكرميات وجداريات فندقية',
      tier: 'خبير',
      phoneNumber: '01123456789',
      paymentType: 'piece_rate',
      pieceRatePercentage: 100,
      isActive: true,
      totalEarned: 2400,
      totalPaid: 1800,
      currentBalance: 600,
      createdAt: Date.now() - 86400000 * 60,
    });

    await db.employees.put({
      id: 'emp_2',
      tenantId,
      fullName: 'ياسمين كمال',
      specialty: 'قص وتجهيز الخيوط والشراشيب',
      tier: 'متوسط',
      phoneNumber: '01234567890',
      paymentType: 'fixed_salary',
      baseSalary: 3500,
      isActive: true,
      totalEarned: 3500,
      totalPaid: 3500,
      currentBalance: 0,
      createdAt: Date.now() - 86400000 * 45,
    });

    // Seed customer
    await db.customers.put({
      id: 'cust_1',
      tenantId,
      fullName: 'مها الألفي (جاليري لمسات)',
      phoneNumber: '01098765432',
      city: 'القاهرة - المعادي',
      totalPurchases: 3200,
      outstandingBalance: 400,
      notes: 'عميلة دائمة - ديكورات معمارية وفلل',
      createdAt: Date.now() - 86400000 * 20,
    });
  },
};
