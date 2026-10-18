import React, { useState, useEffect } from 'react';
import {
  WorkOrderRecord,
  RawMaterialItem,
  EmployeeProfile,
  WorkshopProfile,
} from '../../types';
import { firestoreService } from '../../db/firestoreService';
import {
  Hammer,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Boxes,
  RotateCcw,
  AlertTriangle,
  HelpCircle,
  X,
  Trash2,
  PackageCheck,
  Percent,
} from 'lucide-react';

interface WorkOrdersViewProps {
  workshop: WorkshopProfile;
  onOpenHelp: (sectionId: string) => void;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workshop,
  onOpenHelp,
}) => {
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [materials, setMaterials] = useState<RawMaterialItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [pulledMaterials, setPulledMaterials] = useState<
    Array<{ materialId: string; materialName: string; quantity: number; unitCost: number; unit: string }>
  >([]);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Close Wizard Modal
  const [closingOrder, setClosingOrder] = useState<WorkOrderRecord | null>(null);
  const [producedQuantity, setProducedQuantity] = useState(1);
  const [returnedMaterials, setReturnedMaterials] = useState<
    Array<{ materialId: string; materialName: string; quantity: number; unitCost: number; unit: string }>
  >([]);
  const [laborCost, setLaborCost] = useState('150');
  const [closingNotes, setClosingNotes] = useState('');
  const [savingClose, setSavingClose] = useState(false);

  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [woList, matList, empList] = await Promise.all([
        firestoreService.getWorkOrders(workshop.id),
        firestoreService.getRawMaterials(workshop.id),
        firestoreService.getEmployees(workshop.id),
      ]);
      setWorkOrders(woList);
      setMaterials(matList);
      setEmployees(empList);
      if (empList.length > 0 && !assignedEmployeeId) {
        setAssignedEmployeeId(empList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setNotice({ text: err.message || 'فشل تحميل أوامر التشغيل', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workshop.id]);

  const handleOpenCreate = () => {
    setProductName('رانر مكرمية بوهيمي فاخر');
    setTargetQuantity(1);
    const defaultMat = materials[0];
    setPulledMaterials([
      {
        materialId: defaultMat?.id || '',
        materialName: defaultMat?.materialName || 'خيط قطن مجدول',
        quantity: 2,
        unit: defaultMat?.unit || 'كيلو',
        unitCost: defaultMat?.costPerUnit || 180,
      },
    ]);
    setIsCreateModalOpen(true);
  };

  const handleAddMaterialRow = () => {
    const defaultMat = materials[0];
    setPulledMaterials([
      ...pulledMaterials,
      {
        materialId: defaultMat?.id || '',
        materialName: defaultMat?.materialName || '',
        quantity: 1,
        unit: defaultMat?.unit || 'كيلو',
        unitCost: defaultMat?.costPerUnit || 100,
      },
    ]);
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || pulledMaterials.length === 0) return;

    setCreatingOrder(true);
    try {
      const orderNumber = await firestoreService.getNextWorkOrderNumber(workshop.id);
      const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);

      const newOrder: WorkOrderRecord = {
        id: 'wo_' + Date.now(),
        workshopId: workshop.id,
        orderNumber,
        productName: productName.trim(),
        craftId: 'macrame',
        category: 'مشغولات يدوية',
        targetQuantity: Number(targetQuantity) || 1,
        assignedEmployeeId: assignedEmp?.id,
        assignedEmployeeName: assignedEmp?.fullName,
        assignedEmployeeWage: 150,
        status: 'open',
        pulledMaterials,
        returnedMaterials: [],
        finishedProductsProduced: 0,
        scrapItems: [],
        totalConsumedMaterialsCost: 0,
        totalLaborCost: 0,
        totalProductionCost: 0,
        unitCostCalculated: 0,
        startDate: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: workshop.email,
      };

      await firestoreService.createWorkOrder(workshop.id, newOrder, workshop.email);
      setNotice({ text: `تم فتح أمر التشغيل #${orderNumber} وصرف الخامات من المخزن بنجاح!` });
      setIsCreateModalOpen(false);
      await loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل فتح أمر التشغيل', isError: true });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleOpenCloseWizard = (wo: WorkOrderRecord) => {
    setClosingOrder(wo);
    setProducedQuantity(wo.targetQuantity || 1);
    // Initialize returned materials with 0 for each pulled material
    setReturnedMaterials(
      wo.pulledMaterials.map((m) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: 0,
        unitCost: m.unitCost,
        unit: m.unit,
      }))
    );
    setLaborCost(String(wo.assignedEmployeeWage || 150));
    setClosingNotes('');
  };

  const handleExecuteClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingOrder) return;

    setSavingClose(true);
    try {
      // Calculate waste/scrap items
      const scrapItems = closingOrder.pulledMaterials.map((pulled) => {
        const returned = returnedMaterials.find((r) => r.materialId === pulled.materialId)?.quantity || 0;
        const actualConsumed = Math.max(0, pulled.quantity - returned);
        // Standard expected ~ 88% of consumption, 12% scrap
        const scrapQty = Math.round(actualConsumed * 0.12 * 1000) / 1000;
        return {
          materialId: pulled.materialId,
          materialName: pulled.materialName,
          wasteQty: scrapQty,
          wasteCost: Math.round(scrapQty * pulled.unitCost * 100) / 100,
          unit: pulled.unit,
        };
      });

      await firestoreService.closeWorkOrder(
        workshop.id,
        closingOrder.id,
        {
          finishedProductsProduced: Number(producedQuantity) || 1,
          returnedMaterials,
          scrapItems,
          laborCost: Number(laborCost) || 0,
          closingNotes,
        },
        workshop.email
      );

      setNotice({
        text: `تم إغلاق أمر التشغيل #${closingOrder.orderNumber}! أضيفت المنتجات المصنعة لمخزن المنتجات وسُجّل الهالك بدقة.`,
      });
      setClosingOrder(null);
      await loadData();
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setNotice({ text: err.message || 'فشل إغلاق أمر التشغيل', isError: true });
    } finally {
      setSavingClose(false);
    }
  };

  const filteredOrders = workOrders.filter((wo) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      wo.orderNumber.toLowerCase().includes(q) ||
      wo.productName.toLowerCase().includes(q) ||
      wo.assignedEmployeeName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent border border-orange-300/40 dark:border-orange-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-700 dark:text-orange-400">
            <Hammer className="w-4 h-4" />
            <span>إدارة خط الإنتاج والتشغيل</span>
            <button
              type="button"
              onClick={() => onOpenHelp('work_orders')}
              className="text-stone-400 hover:text-orange-600 cursor-pointer"
              title="ما معنى هذا؟"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            أوامر التشغيل وتتبع الهالك (Work Orders)
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            أمر التشغيل يبقى مفتوحاً طوال فترة التصنيع. وعند إغلاقه تضاف المنتجات لمخزن المنتجات ويُقاس الهالك الفعلي.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>فتح أمر تشغيل جديد</span>
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            notice.isError
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800'
              : 'bg-orange-50 dark:bg-orange-950/60 border border-orange-300 text-orange-800'
          }`}
        >
          {notice.isError ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Work Orders List */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم أمر التشغيل أو المنتج..."
              className="w-full px-3.5 py-2 pr-9 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
            />
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <span className="text-xs text-stone-400 font-mono">
            {filteredOrders.length} أوامر تشغيل
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs">جاري تحميل أوامر التشغيل...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs font-bold">
            لا توجد أوامر تشغيل مسجلة حالياً.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((wo) => {
              const isOpen = wo.status === 'open';
              return (
                <div
                  key={wo.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition space-y-3 ${
                    isOpen
                      ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 shadow-xs'
                      : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-orange-600 dark:text-orange-400">
                        #{wo.orderNumber}
                      </span>
                      <h3 className="font-black text-sm text-stone-900 dark:text-stone-100">
                        {wo.productName}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOpen
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isOpen ? 'تحت التشغيل (مفتوح للتعديل)' : 'تم الإنتاج والإغلاق'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCloseWizard(wo)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>إغلاق وحساب الهالك</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono font-bold text-stone-500">
                          تكلفة الوحدة: {wo.unitCostCalculated} {workshop.currencySymbol}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Materials Pulled */}
                  <div className="pt-2 border-t border-stone-200/50 dark:border-stone-700/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500 font-bold block mb-1">
                        الخامات المسحوبة من المخزن:
                      </span>
                      <div className="space-y-0.5">
                        {wo.pulledMaterials.map((m, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-white dark:bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 font-mono text-[11px] ml-1.5 mb-1"
                          >
                            {m.materialName}: {m.quantity} {m.unit}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-stone-500 font-bold block mb-1">بيانات التنفيذ:</span>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400">
                        الصانع المسؤول: <strong>{wo.assignedEmployeeName || 'حرفي الورشة'}</strong> • الكمية المستهدفة:{' '}
                        <strong>{wo.targetQuantity} قطعة</strong>
                      </p>
                      {wo.scrapItems && wo.scrapItems.length > 0 && (
                        <p className="text-[11px] text-rose-600 font-bold mt-1">
                          الهالك المسجل: {wo.scrapItems.map((s) => `${s.materialName} (${s.wasteQty} ${s.unit})`).join('، ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Work Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateWorkOrder}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-orange-300 dark:border-stone-700 w-full max-w-2xl max-h-[92vh] overflow-y-auto space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-orange-900 dark:text-orange-300 flex items-center gap-1.5">
                <Hammer className="w-4 h-4 text-orange-600" />
                <span>فتح أمر تشغيل وسحب خامات من المخزن</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  اسم المنتج المراد تصنيعه *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="مثال: رانر قطن 35*150 سم"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  الكمية المستهدفة (عدد القطع) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono font-bold text-xs text-center"
                />
              </div>
            </div>

            {/* Pulled Materials */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">الخامات المسحوبة من مخزن الخامات:</span>
                <button
                  type="button"
                  onClick={handleAddMaterialRow}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة خامة</span>
                </button>
              </div>

              {pulledMaterials.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 grid grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="col-span-7">
                    <select
                      value={item.materialId}
                      onChange={(e) => {
                        const m = materials.find((mat) => mat.id === e.target.value);
                        if (m) {
                          const updated = [...pulledMaterials];
                          updated[idx] = {
                            materialId: m.id,
                            materialName: m.materialName,
                            quantity: updated[idx].quantity,
                            unit: m.unit,
                            unitCost: m.costPerUnit,
                          };
                          setPulledMaterials(updated);
                        }
                      }}
                      className="w-full px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.materialName} (المتاح: {m.currentStock} {m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...pulledMaterials];
                        updated[idx].quantity = Number(e.target.value);
                        setPulledMaterials(updated);
                      }}
                      placeholder="الكمية المسحوبة"
                      className="w-full px-2 py-1.5 text-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => setPulledMaterials(pulledMaterials.filter((_, i) => i !== idx))}
                      disabled={pulledMaterials.length === 1}
                      className="p-1 text-rose-500 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={creatingOrder}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {creatingOrder ? 'جاري الفتح...' : 'صرف الخامات وفتح أمر التشغيل'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Close Wizard Modal */}
      {closingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleExecuteClose}
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-emerald-300 dark:border-stone-700 w-full max-w-xl max-h-[92vh] overflow-y-auto space-y-4 text-right shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setClosingOrder(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>معالج إغلاق أمر التشغيل #{closingOrder.orderNumber}</span>
              </h3>
            </div>

            {/* Step A: Produced Products */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                (أ) المنتجات المصنعة التامة:
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-700 dark:text-stone-300 flex-1">
                  {closingOrder.productName}
                </span>
                <div className="w-32">
                  <input
                    type="number"
                    min="1"
                    required
                    value={producedQuantity}
                    onChange={(e) => setProducedQuantity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-center rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 font-mono font-bold text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Step B: Returned Materials */}
            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-2 text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-200 block">
                (ب) الخامات السليمة المرتجعة لمخزن الخامات (إن وجدت):
              </span>
              {returnedMaterials.map((ret, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-stone-700 dark:text-stone-300">
                    {ret.materialName} ({ret.unit}):
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ret.quantity}
                    onChange={(e) => {
                      const updated = [...returnedMaterials];
                      updated[idx].quantity = Number(e.target.value);
                      setReturnedMaterials(updated);
                    }}
                    className="w-28 px-2 py-1 text-center rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-stone-900 font-mono font-bold"
                  />
                </div>
              ))}
            </div>

            {/* Step C: Labor & Notes */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-stone-700 dark:text-stone-300">
                  أجور ومصنعية اليد العاملة ({workshop.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 font-mono font-bold text-center"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-stone-700 dark:text-stone-300">
                  ملاحظات الإغلاق
                </label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="تم الفنش والتغليف بنجاح..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setClosingOrder(null)}
                className="px-4 py-2 text-xs font-bold text-stone-500"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingClose}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                {savingClose ? 'جاري الاعتماد...' : 'اعتماد الإغلاق وتغذية مخزن المنتجات'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
