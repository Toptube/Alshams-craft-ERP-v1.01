import React, { useState, useEffect, useMemo } from 'react';
import {
  CalculationInput,
  CalculationOutput,
  CraftCategory,
  Shape3DType,
  UserProfile,
  ExtraMaterialRow,
  SavedProductRecord,
  RawMaterialItem,
  EmployeeProfile,
} from '../../types';
import {
  CRAFT_CATEGORIES,
  CORD_TYPES,
  calculateMacrame,
  is3DCategory,
  isLargeItemCategory,
  getGenderArtistTitle,
  getGenderCreatorAdjective,
  FOUNDATIONAL_UNITS,
} from '../../utils/macrameMath';
import { tenantStorage } from '../../db/dexieDB';
import { firestoreService } from '../../db/firestoreService';
import {
  MAIN_SECTIONS,
  SUB_CRAFTS_REGISTRY,
  MainSectionId,
} from '../../registry/craftsRegistry';
import {
  Calculator,
  Pencil,
  Plus,
  Trash2,
  Save,
  Share2,
  Sparkles,
  Layers,
  Scale,
  DollarSign,
  Package,
  Truck,
  Building,
  Info,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Boxes,
  UserCheck,
  PlusCircle,
} from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import {
  ensureDefaultBasicYarns,
  isBasicMaterial,
  isExtraMaterial,
  stripParentheses,
  adaptMaterialToCordOption,
} from '../../services/materialCalculatorAdapter';

interface ProductionCalculatorProps {
  profile: UserProfile;
  initialRecord?: SavedProductRecord | null;
  onOpenWhatsAppShare: (record: SavedProductRecord) => void;
  onOpenNewMaterialModal: () => void;
  onSavedSuccess?: () => void;
  externalNotesToTransfer?: string | null;
  onNotesTransferredHandled?: () => void;
}

export const ProductionCalculator: React.FC<ProductionCalculatorProps> = ({
  profile,
  initialRecord,
  onOpenWhatsAppShare,
  onOpenNewMaterialModal,
  onSavedSuccess,
  externalNotesToTransfer,
  onNotesTransferredHandled,
}) => {
  // Live Raw Materials & Employees from Database
  const [dbMaterials, setDbMaterials] = useState<RawMaterialItem[]>([]);
  const [dbEmployees, setDbEmployees] = useState<EmployeeProfile[]>([]);

  // 1. User selected crafts & sequential dropdowns
  const userCraftIds = useMemo(() => {
    return profile.selectedCrafts && profile.selectedCrafts.length > 0
      ? profile.selectedCrafts
      : ['macrame'];
  }, [profile.selectedCrafts]);

  // Sub-crafts selected by the artisan
  const userSubCrafts = useMemo(() => {
    const list = SUB_CRAFTS_REGISTRY.filter((sc) => userCraftIds.includes(sc.id));
    return list.length > 0 ? list : SUB_CRAFTS_REGISTRY.filter((sc) => sc.id === 'macrame');
  }, [userCraftIds]);

  // Available main sections for the artisan (only sections that have selected crafts)
  const availableMainSections = useMemo(() => {
    const activeSecIds = new Set(userSubCrafts.map((sc) => sc.mainSectionId));
    return MAIN_SECTIONS.filter((sec) => activeSecIds.has(sec.id));
  }, [userSubCrafts]);

  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    if (initialRecord?.mainSectionId) return initialRecord.mainSectionId;
    return availableMainSections.length > 0 ? availableMainSections[0].id : 'ropes_textiles';
  });

  // Keep selectedSectionId in sync if availableMainSections change
  useEffect(() => {
    if (availableMainSections.length > 0) {
      if (!selectedSectionId || !availableMainSections.some((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(availableMainSections[0].id);
      }
    }
  }, [availableMainSections, selectedSectionId]);

  // Sub-crafts under selected main section
  const availableSubCrafts = useMemo(() => {
    if (!selectedSectionId) return [];
    return userSubCrafts.filter((sc) => sc.mainSectionId === selectedSectionId);
  }, [userSubCrafts, selectedSectionId]);

  const [selectedCraftId, setSelectedCraftId] = useState<string>(() => {
    if (initialRecord?.craftId) return initialRecord.craftId;
    const initialAvailable = userSubCrafts.filter(
      (sc) => sc.mainSectionId === (initialRecord?.mainSectionId || availableMainSections[0]?.id)
    );
    return initialAvailable.length > 0 ? initialAvailable[0].id : 'macrame';
  });

  // Keep selectedCraftId in sync when availableSubCrafts change
  useEffect(() => {
    if (availableSubCrafts.length > 0) {
      if (!selectedCraftId || !availableSubCrafts.some((c) => c.id === selectedCraftId)) {
        setSelectedCraftId(availableSubCrafts[0].id);
      }
    }
  }, [availableSubCrafts, selectedCraftId]);

  // Current craft definition
  const currentCraftDef = useMemo(() => {
    return (
      availableSubCrafts.find((c) => c.id === selectedCraftId) ||
      SUB_CRAFTS_REGISTRY.find((c) => c.id === selectedCraftId)
    );
  }, [availableSubCrafts, selectedCraftId]);

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Available product types under selected craft
  const availableProductTypes = useMemo(() => {
    const baseTypes =
      currentCraftDef?.sampleCategories && currentCraftDef.sampleCategories.length > 0
        ? currentCraftDef.sampleCategories
        : selectedCraftId === 'macrame'
        ? CRAFT_CATEGORIES
        : [];
    return Array.from(new Set([...baseTypes, ...customCategories]));
  }, [currentCraftDef, selectedCraftId, customCategories]);

  // Workflow sequence: Category / Product type
  const [category, setCategory] = useState<CraftCategory>(
    (initialRecord?.category as CraftCategory) || 'جدارية'
  );

  // Keep category in sync with availableProductTypes
  useEffect(() => {
    if (availableProductTypes.length > 0) {
      if (!category || !availableProductTypes.includes(category as any)) {
        if (initialRecord?.category && availableProductTypes.includes(initialRecord.category as any)) {
          setCategory(initialRecord.category as any);
        } else {
          setCategory(availableProductTypes[0] as any);
        }
      }
    }
  }, [availableProductTypes]);

  // Dropdown visibility: "تُخفى القائمة تلقائياً إن كان فيها خيار واحد"
  const showSectionDropdown = availableMainSections.length > 1;
  const showCraftDropdown = availableSubCrafts.length > 1;
  const showProductTypeDropdown = availableProductTypes.length > 1;

  // "لا تظهر حقول الإدخال حتى تكتمل الاختيارات"
  const isSelectionComplete = Boolean(selectedSectionId && selectedCraftId && category);

  const [productName, setProductName] = useState(
    initialRecord?.productName || 'جدارية بوهيمية بالخرز الخشبي'
  );

  const [productImageUrl, setProductImageUrl] = useState(
    initialRecord?.imageUrl || ''
  );

  // 3D Shape
  const [shape3D, setShape3D] = useState<Shape3DType>(
    initialRecord?.input?.shape3D || 'flat'
  );

  // Dimensions
  const [widthCm, setWidthCm] = useState<number>(
    initialRecord?.input?.widthCm ?? 60
  );
  const [diameterCm, setDiameterCm] = useState<number>(
    initialRecord?.input?.diameterCm ?? 35
  );
  const [baseDiameterCm, setBaseDiameterCm] = useState<number>(
    initialRecord?.input?.baseDiameterCm ?? 40
  );
  const [sideHeightCm, setSideHeightCm] = useState<number>(
    initialRecord?.input?.sideHeightCm ?? 45
  );
  const [totalLengthCm, setTotalLengthCm] = useState<number>(
    initialRecord?.input?.totalLengthCm ?? 90
  );
  const [fringeLengthCm, setFringeLengthCm] = useState<number>(
    initialRecord?.input?.fringeLengthCm ?? 15
  );

  // Cord parameters
  const [cordTypeId, setCordTypeId] = useState<string>(
    initialRecord?.input?.cordTypeId || 'cotton_braided'
  );
  const [cordThicknessMm, setCordThicknessMm] = useState<number>(
    initialRecord?.input?.cordThicknessMm ?? 4
  );
  const [pricePerKg, setPricePerKg] = useState<number>(
    initialRecord?.input?.pricePerKg ?? 180
  );

  // Conditional material costs
  const [curtainRodCost, setCurtainRodCost] = useState<number>(
    initialRecord?.input?.curtainRodCost ?? 50
  );
  const [cushionCoverCost, setCushionCoverCost] = useState<number>(
    initialRecord?.input?.cushionCoverCost ?? 60
  );
  const [fiberCost, setFiberCost] = useState<number>(
    initialRecord?.input?.fiberCost ?? 35
  );
  const [bagAccessoriesCost, setBagAccessoriesCost] = useState<number>(
    initialRecord?.input?.bagAccessoriesCost ?? 45
  );

  // Dynamic extra materials rows
  const [extraMaterials, setExtraMaterials] = useState<ExtraMaterialRow[]>(
    initialRecord?.input?.extraMaterials || [
      {
        id: 'mat_1',
        name: 'خرز خشبي طبيعي معالج',
        unit: 'حبة',
        unitPrice: 2.5,
        quantity: 12,
        totalCost: 30,
      },
    ]
  );

  // Labor, Assigned Employee & Overhead Costs
  const [laborWage, setLaborWage] = useState<number>(
    initialRecord?.input?.laborWage ?? 180
  );
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>(
    initialRecord?.input?.assignedEmployeeId || ''
  );

  // Packaging defaults: 20 EGP small items, 150 EGP large items
  const defaultPackaging = isLargeItemCategory(category) ? 150 : 20;
  const [packagingCost, setPackagingCost] = useState<number>(
    initialRecord?.input?.packagingCost ?? defaultPackaging
  );

  const [transitFees, setTransitFees] = useState<number>(
    initialRecord?.input?.transitFees ?? 0
  );
  const [adminExpensesShare, setAdminExpensesShare] = useState<number>(
    initialRecord?.input?.adminExpensesShare ?? 30
  );

  // Insulated profit margin (0 - 500%)
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(
    initialRecord?.input?.profitMarginPercent ?? 80
  );

  // Pencil manual override toggles
  const [overrideStrandsActive, setOverrideStrandsActive] = useState<boolean>(
    Boolean(initialRecord?.input?.manualOverrideStrands)
  );
  const [manualStrands, setManualStrands] = useState<string>(
    initialRecord?.input?.manualOverrideStrands ? String(initialRecord.input.manualOverrideStrands) : ''
  );

  const [overrideLengthActive, setOverrideLengthActive] = useState<boolean>(
    Boolean(initialRecord?.input?.manualOverrideStrandLength)
  );
  const [manualLength, setManualLength] = useState<string>(
    initialRecord?.input?.manualOverrideStrandLength ? String(initialRecord.input.manualOverrideStrandLength) : ''
  );

  const [overrideWeightActive, setOverrideWeightActive] = useState<boolean>(
    Boolean(initialRecord?.input?.manualOverrideTotalWeightKg)
  );
  const [manualWeightKg, setManualWeightKg] = useState<string>(
    initialRecord?.input?.manualOverrideTotalWeightKg ? String(initialRecord.input.manualOverrideTotalWeightKg) : ''
  );

  // Personal notes box
  const [personalNotes, setPersonalNotes] = useState<string>(
    initialRecord?.input?.personalNotes || ''
  );

  // Editing existing record ID (for mutation rather than duplication)
  const [existingRecordId, setExistingRecordId] = useState<string | null>(
    initialRecord?.id || null
  );

  const [saveStatus, setSaveStatus] = useState<string>('');

  // Load database raw materials & employees for dynamic feeding
  const loadDatabaseMaterialsAndStaff = async () => {
    try {
      const tenantId = profile.tenantId || profile.workshopId || profile.id || '';
      if (!tenantId) return;

      const [allMats, emps] = await Promise.all([
        ensureDefaultBasicYarns(tenantId),
        tenantStorage.getEmployees(tenantId).catch(() => []),
      ]);
      setDbMaterials(allMats);
      setDbEmployees(emps);

      const basicMats = allMats.filter(isBasicMaterial);

      // If no initial record, sync cordTypeId and pricePerKg from basic materials
      if (!initialRecord) {
        const matchingYarn = basicMats.find((m) => m.id === cordTypeId);
        if (matchingYarn) {
          const price =
            matchingYarn.unit === 'جرام'
              ? (matchingYarn.costPerUnit || 0.18) * 1000
              : (matchingYarn.costPerUnit || (matchingYarn.costPerGram ? matchingYarn.costPerGram * 1000 : 180));
          setPricePerKg(Math.round(price));
        } else if (basicMats.length > 0) {
          const firstMat = basicMats[0];
          setCordTypeId(firstMat.id);
          const price =
            firstMat.unit === 'جرام'
              ? (firstMat.costPerUnit || 0.18) * 1000
              : (firstMat.costPerUnit || (firstMat.costPerGram ? firstMat.costPerGram * 1000 : 180));
          setPricePerKg(Math.round(price));
          const cordOpt = adaptMaterialToCordOption(firstMat);
          if (cordOpt.defaultThicknessMm) {
            setCordThicknessMm(cordOpt.defaultThicknessMm);
          }
        }
      }
    } catch (err) {
      console.error('Error loading materials:', err);
    }
  };

  useEffect(() => {
    loadDatabaseMaterialsAndStaff();
  }, [profile.tenantId, profile.workshopId, profile.id]);

  // Basic materials for cord dropdown & Extra materials for dynamic rows
  const basicMaterials = useMemo(() => {
    return dbMaterials.filter(isBasicMaterial);
  }, [dbMaterials]);

  const extraMaterialsList = useMemo(() => {
    return dbMaterials.filter(isExtraMaterial);
  }, [dbMaterials]);

  // Transfer notes from Falcon AI if requested
  useEffect(() => {
    if (externalNotesToTransfer) {
      setPersonalNotes((prev) =>
        prev
          ? `${prev}\n---\n[ملاحظات صقر الشمساوية AI]:\n${externalNotesToTransfer}`
          : `[ملاحظات صقر الشمساوية AI]:\n${externalNotesToTransfer}`
      );
      if (onNotesTransferredHandled) {
        onNotesTransferredHandled();
      }
    }
  }, [externalNotesToTransfer, onNotesTransferredHandled]);

  // Sync category changes with packaging default & shapes
  useEffect(() => {
    if (isLargeItemCategory(category)) {
      setPackagingCost((prev) => (prev === 20 ? 150 : prev));
    } else {
      setPackagingCost((prev) => (prev === 150 ? 20 : prev));
    }

    if (is3DCategory(category)) {
      if (shape3D === 'flat') {
        setShape3D('cylinder');
      }
    } else {
      setShape3D('flat');
    }
  }, [category]);

  // Handle Cord type selection and default price sync from chosen material
  const handleCordTypeChange = (id: string) => {
    setCordTypeId(id);
    const selectedMat = basicMaterials.find((m) => m.id === id);
    if (selectedMat) {
      const price =
        selectedMat.unit === 'جرام'
          ? (selectedMat.costPerUnit || 0.18) * 1000
          : (selectedMat.costPerUnit || (selectedMat.costPerGram ? selectedMat.costPerGram * 1000 : 180));
      setPricePerKg(Math.round(price));
      const cordOpt = adaptMaterialToCordOption(selectedMat);
      if (cordOpt.defaultThicknessMm) {
        setCordThicknessMm(cordOpt.defaultThicknessMm);
      }
    } else {
      const selected = CORD_TYPES.find((c) => c.id === id);
      if (selected) {
        setPricePerKg(selected.defaultPricePerKg);
        setCordThicknessMm(selected.defaultThicknessMm);
      }
    }
  };

  // Extra materials handlers (pulls from database or adds custom item)
  const handleAddMaterialRow = (fromDbMaterialId?: string) => {
    let name = '';
    let unit = 'قطعة';
    let unitPrice = 0;
    let materialDbId: string | undefined = undefined;

    if (fromDbMaterialId) {
      const dbMat = extraMaterialsList.find((m) => m.id === fromDbMaterialId);
      if (dbMat) {
        materialDbId = dbMat.id;
        name = dbMat.materialName;
        unit = dbMat.unit;
        unitPrice = dbMat.costPerUnit;
      }
    }

    const newRow: ExtraMaterialRow = {
      id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      materialDbId,
      name,
      unit,
      unitPrice,
      quantity: 1,
      totalCost: unitPrice,
    };
    setExtraMaterials([...extraMaterials, newRow]);
  };

  const handleUpdateMaterialRowMulti = (
    id: string,
    updates: Partial<ExtraMaterialRow>
  ) => {
    setExtraMaterials(
      extraMaterials.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, ...updates };
        updated.totalCost = Math.round(
          (Number(updated.unitPrice) || 0) * (Number(updated.quantity) || 0)
        );
        return updated;
      })
    );
  };

  const handleUpdateMaterialRow = (
    id: string,
    field: keyof ExtraMaterialRow,
    val: any
  ) => {
    setExtraMaterials(
      extraMaterials.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };
        if (field === 'unitPrice' || field === 'quantity') {
          updated.totalCost = Math.round(
            (Number(updated.unitPrice) || 0) * (Number(updated.quantity) || 0)
          );
        }
        return updated;
      })
    );
  };

  const handleRemoveMaterialRow = (id: string) => {
    setExtraMaterials(extraMaterials.filter((r) => r.id !== id));
  };

  // Build current calculation input object
  const calculationInput: CalculationInput = useMemo(() => {
    return {
      category,
      productName,
      shape3D,
      widthCm: Number(widthCm) || 0,
      diameterCm: Number(diameterCm) || 0,
      baseDiameterCm: Number(baseDiameterCm) || 0,
      sideHeightCm: Number(sideHeightCm) || 0,
      totalLengthCm: Number(totalLengthCm) || 0,
      fringeLengthCm: Number(fringeLengthCm) || 0,
      cordTypeId,
      cordThicknessMm: Number(cordThicknessMm) || 4,
      pricePerKg: Number(pricePerKg) || 180,
      curtainRodCost: Number(curtainRodCost) || 0,
      cushionCoverCost: Number(cushionCoverCost) || 0,
      fiberCost: Number(fiberCost) || 0,
      bagAccessoriesCost: Number(bagAccessoriesCost) || 0,
      extraMaterials,
      laborWage: Number(laborWage) || 0,
      assignedEmployeeId: assignedEmployeeId || undefined,
      packagingCost: Number(packagingCost) || 0,
      transitFees: Number(transitFees) || 0,
      adminExpensesShare: Number(adminExpensesShare) || 0,
      profitMarginPercent: Number(profitMarginPercent) || 0,
      manualOverrideStrands:
        overrideStrandsActive && manualStrands ? Number(manualStrands) : undefined,
      manualOverrideStrandLength:
        overrideLengthActive && manualLength ? Number(manualLength) : undefined,
      manualOverrideTotalWeightKg:
        overrideWeightActive && manualWeightKg ? Number(manualWeightKg) : undefined,
      personalNotes,
      productImageUrl,
    };
  }, [
    category,
    productName,
    shape3D,
    widthCm,
    diameterCm,
    baseDiameterCm,
    sideHeightCm,
    totalLengthCm,
    fringeLengthCm,
    cordTypeId,
    cordThicknessMm,
    pricePerKg,
    curtainRodCost,
    cushionCoverCost,
    fiberCost,
    bagAccessoriesCost,
    extraMaterials,
    laborWage,
    assignedEmployeeId,
    packagingCost,
    transitFees,
    adminExpensesShare,
    profitMarginPercent,
    overrideStrandsActive,
    manualStrands,
    overrideLengthActive,
    manualLength,
    overrideWeightActive,
    manualWeightKg,
    personalNotes,
    productImageUrl,
  ]);

  // Execute Macramé & 3D Math Engine (includes / 2 divider for strands)
  const output: CalculationOutput = useMemo(() => {
    return calculateMacrame(calculationInput);
  }, [calculationInput]);

  // 1. Cost Price (إجمالي الخامات المباشرة + المصنعية + التغليف + النقل + المصاريف الإدارية)
  const costPrice = useMemo(() => {
    return Math.round(
      (output.totalDirectMaterialsCost || 0) +
      (output.laborWage || 0) +
      (output.packagingCost || 0) +
      (output.transitFees || 0) +
      (output.adminExpensesShare || 0)
    );
  }, [output]);

  // 2. Retail Price (السعر القطاعي)
  const retailPrice = output.finalSellingPrice || 0;

  // 3. Wholesale Price (سعر الجملة = السعر القطاعي بعد خصم نسبة من هامش الربح فقط - افتراضي 25%)
  const wholesaleMarginDiscountPercent = profile.defaultWholesaleDiscountPercent ?? 25;
  const wholesalePrice = useMemo(() => {
    const profitMarginDiscount = Math.round(
      (output.insulatedProfitAmount || 0) * (wholesaleMarginDiscountPercent / 100)
    );
    return Math.max(costPrice, retailPrice - profitMarginDiscount);
  }, [output.insulatedProfitAmount, wholesaleMarginDiscountPercent, costPrice, retailPrice]);

  // Handle Pencil Override toggles
  const handleTogglePencil = (field: 'strands' | 'length' | 'weight') => {
    if (field === 'strands') {
      const nextState = !overrideStrandsActive;
      setOverrideStrandsActive(nextState);
      if (nextState) {
        setManualStrands(String(output.baseStrandsCount));
      } else {
        setManualStrands('');
      }
    } else if (field === 'length') {
      const nextState = !overrideLengthActive;
      setOverrideLengthActive(nextState);
      if (nextState) {
        setManualLength(String(output.singleStrandLengthCm));
      } else {
        setManualLength('');
      }
    } else if (field === 'weight') {
      const nextState = !overrideWeightActive;
      setOverrideWeightActive(nextState);
      if (nextState) {
        setManualWeightKg(String(output.totalWeightKg));
      } else {
        setManualWeightKg('');
      }
    }
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProductImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save or Mutate Product in Archive (Button relocated to absolute bottom)
  const handleSaveProduct = async () => {
    setSaveStatus('جاري الحفظ وتوليد الرقم التسلسلي في قاعدة البيانات...');
    try {
      const recordId = existingRecordId || `prod_${Date.now()}`;
      const tenantId = profile.tenantId || profile.workshopId || profile.id || '';

      // رقم منتج متسلسل تلقائي (counters داخل transaction)
      let serialNum = initialRecord?.productSerialNumber;
      if (!serialNum) {
        try {
          serialNum = await firestoreService.getNextProductSerialNumber(tenantId);
        } catch (err) {
          console.warn('Counters transaction error, falling back to local counter:', err);
          serialNum = await tenantStorage.getNextProductSerialNumber(tenantId);
        }
      }
      const productCode = `PRD-${String(serialNum).padStart(4, '0')}`;

      const selectedSection = MAIN_SECTIONS.find((s) => s.id === selectedSectionId);
      const selectedCraft = SUB_CRAFTS_REGISTRY.find((c) => c.id === selectedCraftId);

      const savedRecord: SavedProductRecord = {
        id: recordId,
        tenantId,
        workshopId: tenantId,
        productName: productName.trim() || `منتج ${category}`,
        productSerialNumber: serialNum,
        productCode,
        mainSectionId: selectedSectionId,
        mainSectionName: selectedSection?.nameAr || selectedSectionId,
        craftId: selectedCraftId,
        craftName: selectedCraft?.nameAr || selectedCraftId,
        productType: category,
        category,
        costPrice,
        retailPrice,
        wholesalePrice,
        wholesaleMarginDiscountPercent,
        input: calculationInput,
        output,
        imageUrl: productImageUrl,
        isActive: true,
        createdAt: initialRecord?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      // Mutates / overwrites existing record via Dexie instead of duplicating
      await tenantStorage.mutateProduct(savedRecord);
      try {
        await firestoreService.saveSavedProductRecord(tenantId, savedRecord);
      } catch (e) {
        console.warn('Could not sync product to firestore:', e);
      }

      setExistingRecordId(recordId);

      // If user overrode values, log to local AI knowledge base for continuous learning
      if (calculationInput.manualOverrideStrands) {
        await tenantStorage.logArtisanOverride({
          id: 'ai_kn_' + Math.random().toString(36).substring(2, 9),
          tenantId,
          category,
          overrideField: 'عدد الفتلات الأساسية',
          initialValue: output.baseStrandsCount,
          overriddenValue: calculationInput.manualOverrideStrands,
          reason: 'تعديل قلم الحرفي في ورشة الإنتاج',
          timestamp: Date.now(),
        });
      }

      setSaveStatus(`تم حفظ وتوثيق المنتج برقم متسلسل #${serialNum} (${productCode}) بنجاح!`);
      setTimeout(() => setSaveStatus(''), 3000);

      if (onSavedSuccess) onSavedSuccess();
    } catch (err: any) {
      setSaveStatus('تعذر الحفظ: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const is3D = is3DCategory(category);

  return (
    <div className="space-y-6">
      {/* Top Banner - Strictly renamed to "حاسبة تكاليف المنتج" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-800/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Calculator className="w-4 h-4" />
            <span>نظام التسعير والهندسة الحرفية المتقدم</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
            حاسبة تكاليف المنتج: {productName || 'منتج جديد'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {existingRecordId ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300/50">
              تعديل مباشر على السجل الحالي
            </span>
          ) : (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300/50">
              مسودة تسعير جديدة
            </span>
          )}
        </div>
      </div>

      {saveStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* 1. Three Sequential Dropdowns: (أ) القسم الرئيسي (ب) الحرفة الفرعية (ج) نوع المنتج */}
      {(showSectionDropdown || showCraftDropdown || showProductTypeDropdown) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100">
                تحديد مسار المنتج والتصنيف الحرفي
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
              <span>المسار الحرفي:</span>
              <span className="text-amber-600 dark:text-amber-400">
                {currentCraftDef?.nameAr || 'مكرمية'}
              </span>
              <span>•</span>
              <span className="text-stone-700 dark:text-stone-300">{category}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* (أ) القسم الرئيسي - يُخفى إن كان خياراً واحداً */}
            {showSectionDropdown && (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  1. القسم الرئيسي *
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => {
                    const newSecId = e.target.value;
                    setSelectedSectionId(newSecId);
                    const craftsInSec = userSubCrafts.filter((c) => c.mainSectionId === newSecId);
                    if (craftsInSec.length > 0) {
                      const firstCraft = craftsInSec[0];
                      setSelectedCraftId(firstCraft.id);
                      if (firstCraft.sampleCategories && firstCraft.sampleCategories.length > 0) {
                        setCategory(firstCraft.sampleCategories[0] as any);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availableMainSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* (ب) الحرفة الفرعية - تُخفى إن كان خياراً واحداً */}
            {showCraftDropdown && (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  2. الحرفة الفرعية *
                </label>
                <select
                  value={selectedCraftId}
                  onChange={(e) => {
                    const newCraftId = e.target.value;
                    setSelectedCraftId(newCraftId);
                    const craftDef = SUB_CRAFTS_REGISTRY.find((c) => c.id === newCraftId);
                    if (craftDef?.sampleCategories && craftDef.sampleCategories.length > 0) {
                      setCategory(craftDef.sampleCategories[0] as any);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availableSubCrafts.map((craft) => (
                    <option key={craft.id} value={craft.id}>
                      {craft.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* (ج) نوع المنتج - يُخفى إن كان خياراً واحداً */}
            {showProductTypeDropdown && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    3. نوع المنتج *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>نوع مخصص</span>
                  </button>
                </div>

                {isAddingNewCategory && (
                  <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="نوع منتج جديد (مثال: رانر، ستائر، كوشن)"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          setCustomCategories([...customCategories, newCategoryName.trim()]);
                          setCategory(newCategoryName.trim() as any);
                          setNewCategoryName('');
                          setIsAddingNewCategory(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      إضافة
                    </button>
                  </div>
                )}

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availableProductTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. لا تظهر حقول الإدخال حتى تكتمل الاختيارات */}
      {!isSelectionComplete ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
            يرجى استكمال تحديد القسم الرئيسي والحرفة ونوع المنتج
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            حدد الاختيارات من القوائم أعلاه لبدء تشغيل حاسبة التكاليف وعرض كافة مدخلات الأبعاد ومواصفات التشغيل.
          </p>
        </div>
      ) : selectedCraftId !== 'macrame' ? (
        /* 4. لأي حرفة أخرى تظهر الرسالة بدل الحاسبة */
        <div className="p-8 sm:p-14 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-300/40">
            <span>حرفة {currentCraftDef?.nameAr || 'المشغولات اليدوية'}</span>
            <span>•</span>
            <span>{currentCraftDef?.badge || 'معادلات الحرفة المخصصة قريباً'}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100">
            هذه الصفحة لا تزال تحت الإنشاء والتطوير وقريباً جداً ستكون متاحة لك {profile.gender === 'female' ? 'يا فنانة' : 'يا فنان'}
          </h3>
          <p className="text-xs text-stone-500 max-w-lg mx-auto leading-relaxed">
            يقوم فريق العمل حالياً ببرمجة وضبط المعادلات الرياضية والميكانيكية الخاصة بحرفة {currentCraftDef?.nameAr} لحساب استهلاك الخيوط وأوزان الغرز وأبعاد القطع بأقصى دقة.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSelectedCraftId('macrame')}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              العودة لحاسبة المكرمية
            </button>
          </div>
        </div>
      ) : (
        /* 3. للمكرمية: تظهر الحاسبة الحالية كما هي دون أي تغيير في النتائج */
        <>
          {/* Grid: 2 Columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Mechanical & Financial Outputs (Sticky Card) */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4 order-2 lg:order-1">
          {/* Mechanical Output Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                المعادلات الميكانيكية الدقيقة
              </span>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>مخرجات القص والتشغيل</span>
              </h3>
            </div>

            {/* 1. Base Strands (With Divider / 2 and Pencil Override) */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePencil('strands')}
                  title="تعديل يدوي (تفعيل القلم)"
                  className={`p-1.5 rounded-lg transition ${
                    overrideStrandsActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="text-right">
                  <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    عدد الفتلات الأساسية (مضاعفات 4)
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    يعطي الضعف ({output.workingCordsCount}) خيوطاً شغالة على العصا
                  </p>
                </div>
              </div>

              {overrideStrandsActive ? (
                <NumberInput
                  value={manualStrands}
                  onChange={(val) => setManualStrands(String(val))}
                  className="w-20 px-2 py-1 text-center rounded-lg border-2 border-amber-500 bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 font-bold text-sm outline-none font-mono"
                />
              ) : (
                <div className="text-left font-mono">
                  <span className="text-lg font-black text-stone-900 dark:text-stone-100">
                    {output.baseStrandsCount}
                  </span>
                  <span className="text-xs text-stone-500 mr-1">فتلة</span>
                </div>
              )}
            </div>

            {/* 2. Single Strand Cut Length (With Pencil Override) */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePencil('length')}
                  title="تعديل يدوي (تفعيل القلم)"
                  className={`p-1.5 rounded-lg transition ${
                    overrideLengthActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="text-right">
                  <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    طول الفتلة الواحدة المقصوصة
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">
                    بناءً على سمك الخيط ({calculationInput.cordThicknessMm} مم)
                  </p>
                </div>
              </div>

              {overrideLengthActive ? (
                <NumberInput
                  value={manualLength}
                  onChange={(val) => setManualLength(String(val))}
                  className="w-20 px-2 py-1 text-center rounded-lg border-2 border-amber-500 bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 font-bold text-sm outline-none font-mono"
                />
              ) : (
                <div className="text-left font-mono">
                  <span className="text-lg font-black text-stone-900 dark:text-stone-100">
                    {output.singleStrandLengthCm}
                  </span>
                  <span className="text-xs text-stone-500 mr-1">سم</span>
                </div>
              )}
            </div>

            {/* 3. Total Weight in Kilograms (Strictly display in KG) */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePencil('weight')}
                  title="تعديل يدوي (تفعيل القلم)"
                  className={`p-1.5 rounded-lg transition ${
                    overrideWeightActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <div className="text-right">
                  <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    الوزن الإجمالي بالكيلو جرام
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">
                    يعادل {output.totalWeightGrams} جرام خيط
                  </p>
                </div>
              </div>

              {overrideWeightActive ? (
                <NumberInput
                  step="0.05"
                  value={manualWeightKg}
                  onChange={(val) => setManualWeightKg(String(val))}
                  className="w-24 px-2 py-1 text-center rounded-lg border-2 border-amber-500 bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 font-bold text-sm outline-none font-mono"
                />
              ) : (
                <div className="text-left font-mono">
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {output.totalWeightKg.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-600 dark:text-stone-400 mr-1 font-bold">
                    كجم
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-stone-500 dark:text-stone-400 px-1 flex items-center justify-between">
              <span>إجمالي أمتار الخيط:</span>
              <span className="font-mono font-bold text-stone-700 dark:text-stone-300">
                {output.totalYarnLengthMeters} متر
              </span>
            </div>
          </div>

          {/* Insulated Selling Price Breakdown Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-xs font-mono text-amber-200">
                INSULATED MARKUP ENGINE
              </span>
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-300" />
                <span>حساب سعر البيع المعزول</span>
              </h3>
            </div>

            {/* Direct Materials Cost */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-amber-100">
                <span>تكلفة الخيط ({output.totalWeightKg.toFixed(2)} كجم):</span>
                <span className="font-mono font-bold text-white">
                  {output.yarnCost} {profile.currencySymbol}
                </span>
              </div>

              {output.extraMaterialsTotalCost > 0 && (
                <div className="flex justify-between items-center text-amber-100">
                  <span>الخامات والملحقات الإضافية:</span>
                  <span className="font-mono font-bold text-white">
                    +{output.extraMaterialsTotalCost} {profile.currencySymbol}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-amber-200/90 pt-1 border-t border-white/10 font-bold">
                <span>إجمالي الخامات المباشرة:</span>
                <span className="font-mono text-amber-200">
                  {output.totalDirectMaterialsCost} {profile.currencySymbol}
                </span>
              </div>
            </div>

            {/* Insulated Profit Highlight */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-200">
                  صافي الربح المعزول ({profitMarginPercent}% على الخامات فقط):
                </span>
                <span className="font-mono font-extrabold text-amber-300 text-sm">
                  +{output.insulatedProfitAmount} {profile.currencySymbol}
                </span>
              </div>
              <p className="text-[10px] text-amber-200/70 leading-relaxed">
                * معزول تماماً: لا يتم ضرب نسبة الربح في أجور المصنعية أو التغليف أو المصاريف الإدارية.
              </p>
            </div>

            {/* Other Cost Additions */}
            <div className="space-y-1.5 text-xs text-amber-100/90">
              <div className="flex justify-between items-center">
                <span>أجرة المصنعية لليد العاملة:</span>
                <span className="font-mono font-bold text-white">
                  +{output.laborWage} {profile.currencySymbol}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>التغليف والحماية:</span>
                <span className="font-mono font-bold text-white">
                  +{output.packagingCost} {profile.currencySymbol}
                </span>
              </div>

              {output.transitFees > 0 && (
                <div className="flex justify-between items-center">
                  <span>مصاريف النقل الداخلي:</span>
                  <span className="font-mono font-bold text-white">
                    +{output.transitFees} {profile.currencySymbol}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>نصيب التكاليف الإدارية للورشة:</span>
                <span className="font-mono font-bold text-white">
                  +{output.adminExpensesShare} {profile.currencySymbol}
                </span>
              </div>
            </div>

            {/* Total Cost of Production */}
            <div className="flex justify-between items-center text-xs text-amber-200/90 pt-1 border-t border-white/10 font-bold">
              <span>إجمالي تكلفة الإنتاج والمصنعية:</span>
              <span className="font-mono text-white">
                {costPrice} {profile.currencySymbol}
              </span>
            </div>

            {/* Final Grand Selling Price (Retail) */}
            <div className="pt-3 border-t border-white/20 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-amber-200 font-bold">سعر البيع المقترح (قطاعي):</span>
                <p className="text-[10px] text-amber-300/80">شامل كافة التكاليف وهوامش الأمان</p>
              </div>
              <div className="text-left font-mono">
                <span className="text-3xl font-black text-white tracking-tight">
                  {retailPrice}
                </span>
                <span className="text-sm font-bold text-amber-200 mr-1.5">
                  {profile.currencySymbol}
                </span>
              </div>
            </div>

            {/* Wholesale Price Box */}
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-300">سعر البيع بالجملة:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-400/30">
                    خصم {wholesaleMarginDiscountPercent}% من الربح فقط
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/70 mt-0.5">
                  محمي التكاليف بالكامل بدون أي مساس بأجور اليد العاملة
                </p>
              </div>
              <div className="text-left font-mono">
                <span className="text-2xl font-black text-emerald-300">
                  {wholesalePrice}
                </span>
                <span className="text-xs font-bold text-emerald-200 mr-1">
                  {profile.currencySymbol}
                </span>
              </div>
            </div>

            {/* WhatsApp Quote Trigger */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const selectedSection = MAIN_SECTIONS.find((s) => s.id === selectedSectionId);
                  const selectedCraft = SUB_CRAFTS_REGISTRY.find((c) => c.id === selectedCraftId);
                  const record: SavedProductRecord = {
                    id: existingRecordId || `prod_${Date.now()}`,
                    tenantId: profile.tenantId,
                    workshopId: profile.tenantId,
                    productName,
                    productSerialNumber: initialRecord?.productSerialNumber,
                    productCode: initialRecord?.productCode,
                    mainSectionId: selectedSectionId,
                    mainSectionName: selectedSection?.nameAr || selectedSectionId,
                    craftId: selectedCraftId,
                    craftName: selectedCraft?.nameAr || selectedCraftId,
                    productType: category,
                    category,
                    costPrice,
                    retailPrice,
                    wholesalePrice,
                    wholesaleMarginDiscountPercent,
                    input: calculationInput,
                    output,
                    imageUrl: productImageUrl,
                    isActive: true,
                    createdAt: initialRecord?.createdAt || Date.now(),
                    updatedAt: Date.now(),
                  };
                  onOpenWhatsAppShare(record);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/30 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>إنشاء عرض سعر واتساب فوري للعميل</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Inputs & 3D Geometry Rules */}
        <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
          {/* Card: 1. Category & Product Identity */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <span className="text-[11px] font-bold text-stone-500">خطوة 1 من 4</span>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                التصنيف وهوية القطعة الفنية
              </h3>
            </div>

            {/* WORKFLOW RULE: Category dropdown MUST appear FIRST strictly BEFORE image upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ إضافة تصنيف جديد</span>
                </button>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  التصنيف الفني الأساسي (يحدد مسار الحسابات والشكل) *
                </label>
              </div>

              {isAddingNewCategory && (
                <div className="mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2 animate-in fade-in">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="اكتب اسم التصنيف الجديد (مثال: مفرش سرير، حزام، معلقة مفاتيح)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCategoryName.trim()) {
                        setCustomCategories([...customCategories, newCategoryName.trim()]);
                        setCategory(newCategoryName.trim() as any);
                        setNewCategoryName('');
                        setIsAddingNewCategory(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs cursor-pointer hover:bg-amber-700"
                  >
                    إضافة
                  </button>
                </div>
              )}

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {availableProductTypes.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                اسم الموديل / القطعة *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="اكتب اسم القطعة الفنية"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Image Upload Box - Placed strictly AFTER Category */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-300 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {productImageUrl ? (
                  <img
                    src={productImageUrl}
                    alt="صورة القطعة"
                    className="w-14 h-14 rounded-xl object-cover border border-amber-500 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 flex items-center justify-center text-amber-700 dark:text-amber-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    صورة المنتج الحرفي
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">
                    يمكن إرفاق صورة التصميم للتوثيق والتحليل
                  </p>
                </div>
              </div>
              <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-200 transition">
                <span>تحديد صورة</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Card: 2. 3D Geometry Overrides & Dimensions */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <span className="text-[11px] font-bold text-stone-500">خطوة 2 من 4</span>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                الأبعاد الهندسية والتشكيل الحرفي
              </h3>
            </div>

            {/* 3D Shape Selection (Displayed if 3D category or selectable) */}
            {is3D ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white">
                    نظام المجسمات ثلاثية الأبعاد (3D Activated)
                  </span>
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    شكل المجسم *
                  </label>
                </div>

                <select
                  value={shape3D}
                  onChange={(e) => setShape3D(e.target.value as Shape3DType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="cylinder">شغل اسطواني (القاعدة والأجناب)</option>
                  <option value="circle">شغل دائري (المحيط فقط)</option>
                  <option value="square">مربع (أربعة جوانب متساوية)</option>
                  <option value="rectangle">مستطيل (محيط الصندوق)</option>
                </select>

                {/* Specific 3D Inputs: Cylinder (Hide flat entries, request Base Diameter & Side Height) */}
                {shape3D === 'cylinder' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                          قطر القاعدة (سم) *
                        </label>
                        <NumberInput
                          value={baseDiameterCm}
                          onChange={setBaseDiameterCm}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                          ارتفاع الأجناب (سم) *
                        </label>
                        <NumberInput
                          value={sideHeightCm}
                          onChange={setSideHeightCm}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                        />
                      </div>
                    </div>

                    {/* Mathematical Plane Calculations */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium space-y-1.5 text-stone-800 dark:text-stone-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-800 dark:text-amber-300">مساحة دائرة القاعدة (Base Circle Area):</span>
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                          {((baseDiameterCm / 2) ** 2 * 3.14).toFixed(1)} سم²
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span>معادلة الحساب:</span>
                        <span className="font-mono">({(baseDiameterCm / 2).toFixed(1)}² × 3.14)</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                        <span className="font-bold text-amber-800 dark:text-amber-300">محيط الأجناب الرأسي (Sides Vertical Perimeter):</span>
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                          {(baseDiameterCm * 3.14).toFixed(1)} سم
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span>معادلة الحساب:</span>
                        <span className="font-mono">({baseDiameterCm} × 3.14)</span>
                      </div>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-1">
                        * تم حجب المدخلات المسطحة تلقائياً لتوافق هندسة المجسم الاسطواني، وتتدرج أطوال وعدد الفتلات لتغطية السطحين (القاعدة والأجناب) بتناغم وانسيابية كاملة.
                      </p>
                    </div>
                  </div>
                )}

                {shape3D === 'circle' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      القطر (سم) *
                    </label>
                    <NumberInput
                      value={diameterCm}
                      onChange={setDiameterCm}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                    />
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                      المحيط المحسوب: {diameterCm} * 3.14 = {(diameterCm * 3.14).toFixed(1)} سم
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Flat Width Input - hidden if 3D category */
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  عرض الشغل المسطح (سم) *
                </label>
                <NumberInput
                  value={widthCm}
                  onChange={setWidthCm}
                  placeholder="مثال: 60"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Length Constraints: Hidden if cylinder, because cylinder uses Side Height exclusively */}
            {shape3D !== 'cylinder' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    طول الشغل الكلي (سم) *
                  </label>
                  <NumberInput
                    value={totalLengthCm}
                    onChange={setTotalLengthCm}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                    طول الشراشيب (سم) *
                  </label>
                  <NumberInput
                    value={fringeLengthCm}
                    onChange={setFringeLengthCm}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  طول الشراشيب السفلية إن وجدت (سم) (اختياري)
                </label>
                <NumberInput
                  value={fringeLengthCm}
                  onChange={setFringeLengthCm}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Card: 3. Cord Specification & Live Raw Materials Feeding */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <span className="text-[11px] font-bold text-stone-500">خطوة 3 من 4</span>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                مواصفات الخيط وتكاليف الخامات
              </h3>
            </div>

            {/* Cord Type & Price per KG (Dropdown text strictly hides pricing numbers) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                    نوع الخيط (الخامات الأساسية) *
                  </label>
                  <button
                    type="button"
                    onClick={onOpenNewMaterialModal}
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>إضافة خيط جديد بالخامات</span>
                  </button>
                </div>
                <select
                  value={cordTypeId}
                  onChange={(e) => handleCordTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {basicMaterials.length > 0 ? (
                    basicMaterials.map((mat, idx) => (
                      <option key={mat.id} value={mat.id}>
                        {idx + 1}. {stripParentheses(mat.materialName)}
                      </option>
                    ))
                  ) : (
                    CORD_TYPES.map((cord, idx) => (
                      <option key={cord.id} value={cord.id}>
                        {idx + 1}. {stripParentheses(cord.name)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  سعر الكيلو الافتراضي ({profile.currencySymbol}) *
                </label>
                <NumberInput
                  value={pricePerKg}
                  onChange={setPricePerKg}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-stone-400 block mt-1">
                  * يؤخذ من الخامة المختارة ويمكن تعديله لهذا المنتج فقط
                </span>
              </div>
            </div>

            {/* Thickness */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                سمك الخيط (ملليمتر) *
              </label>
              <div className="flex items-center gap-2">
                {[3, 4, 5, 6].map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => setCordThicknessMm(th)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition ${
                      cordThicknessMm === th
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {th} مم
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Material Costing by Category */}
            {(category === 'ستائر' || category === 'سجاد') && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                  تكلفة ماسورة خشب أو إكسسوارات الستارة / السجادة ({profile.currencySymbol})
                </label>
                <NumberInput
                  value={curtainRodCost}
                  onChange={setCurtainRodCost}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-sm font-bold outline-none"
                />
              </div>
            )}

            {category === 'كوشن' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    تكلفة كوفر القماش ({profile.currencySymbol})
                  </label>
                  <NumberInput
                    value={cushionCoverCost}
                    onChange={setCushionCoverCost}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    تكلفة الفايبر ({profile.currencySymbol})
                  </label>
                  <NumberInput
                    value={fiberCost}
                    onChange={setFiberCost}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-sm font-bold outline-none"
                  />
                </div>
              </div>
            )}

            {category === 'شنطة أو كلاتش' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                  تكلفة الإكسسوارات (حلقات، سوستة، بطانة، حزام، قفل) ({profile.currencySymbol})
                </label>
                <NumberInput
                  value={bagAccessoriesCost}
                  onChange={setBagAccessoriesCost}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-sm font-bold outline-none"
                />
              </div>
            )}

            {/* Dynamic Material Rows (+ خامات إضافية) with adjacent shortcut button "إضافة خامة جديدة" */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddMaterialRow()}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300/40 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ خامات إضافية</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenNewMaterialModal}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/40 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>إضافة خامة جديدة بالمخزن</span>
                  </button>
                </div>

                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  خامات إضافية مستهلكة بالقطعة (تختار من خامات المخزن أو بند حر)
                </label>
              </div>

              {extraMaterials.map((row) => (
                <div
                  key={row.id}
                  className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex flex-wrap items-center gap-2 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterialRow(row.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    title="حذف هذا الصف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Dropdown to pick from Extra Materials registered in warehouse OR custom */}
                  <select
                    value={row.materialDbId || '__custom__'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        handleUpdateMaterialRowMulti(row.id, {
                          materialDbId: '',
                        });
                      } else {
                        const selectedMat = extraMaterialsList.find((m) => m.id === val);
                        if (selectedMat) {
                          handleUpdateMaterialRowMulti(row.id, {
                            materialDbId: selectedMat.id,
                            name: selectedMat.materialName,
                            unit: selectedMat.unit || 'قطعة',
                            unitPrice: selectedMat.costPerUnit || 0,
                            quantity: row.quantity || 1,
                          });
                        }
                      }
                    }}
                    className="w-full sm:w-44 px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold outline-none"
                  >
                    <option value="__custom__">✏️ بند حر (إدخال يدوي)</option>
                    {extraMaterialsList.length > 0 && (
                      <optgroup label="الخامات الإضافية بالمخزن:">
                        {extraMaterialsList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.materialName} ({m.costPerUnit} {profile.currencySymbol})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => handleUpdateMaterialRow(row.id, 'name', e.target.value)}
                    placeholder="اسم الخامة (مثال: خرز، جلد، شاسيه...)"
                    className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium outline-none"
                  />

                  <div className="flex items-center gap-1">
                    <NumberInput
                      value={row.quantity}
                      onChange={(val) => handleUpdateMaterialRow(row.id, 'quantity', val)}
                      placeholder="الكمية"
                      className="w-16 px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold font-mono outline-none text-center"
                    />
                    <select
                      value={row.unit}
                      onChange={(e) => handleUpdateMaterialRow(row.id, 'unit', e.target.value)}
                      className="text-xs font-bold px-1.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 outline-none"
                    >
                      {FOUNDATIONAL_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-500">سعر:</span>
                    <NumberInput
                      value={row.unitPrice}
                      onChange={(val) => handleUpdateMaterialRow(row.id, 'unitPrice', val)}
                      placeholder="السعر"
                      className="w-16 px-2 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold font-mono outline-none text-center"
                    />
                  </div>

                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono ml-auto">
                    = {row.totalCost} {profile.currencySymbol}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: 4. Labor, HR Assignment, Overheads & Margin Slider */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <span className="text-[11px] font-bold text-stone-500">خطوة 4 من 4</span>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                أجرة اليد، إسناد الفنان، والتكاليف
              </h3>
            </div>

            {/* Profit Margin Slider (Up to 500%) */}
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200 dark:border-stone-700 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="font-mono text-base text-amber-600 dark:text-amber-400">
                  {profitMarginPercent}%
                </span>
                <span className="text-stone-800 dark:text-stone-200">
                  نسبة هامش الربح المعزول (0% إلى 500%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="5"
                value={profitMarginPercent}
                onChange={(e) => setProfitMarginPercent(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>0% (تكلفة فقط)</span>
                <span>100% (ضعف الخامات)</span>
                <span>250%</span>
                <span>500% (أعلى تصدير)</span>
              </div>
            </div>

            {/* Labor Wage & Employee Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  أجرة المصنعية لليد ({profile.currencySymbol}) *
                </label>
                <NumberInput
                  value={laborWage}
                  onChange={setLaborWage}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  إسناد القطعة لفنان / موظف بالورشة
                </label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-bold outline-none"
                >
                  <option value="">-- اختياري (بدون إسناد) --</option>
                  {dbEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.tier} - {emp.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  تكلفة التغليف ({profile.currencySymbol}) *
                </label>
                <NumberInput
                  value={packagingCost}
                  onChange={setPackagingCost}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  مصاريف النقل الداخلي ({profile.currencySymbol})
                </label>
                <NumberInput
                  value={transitFees}
                  onChange={setTransitFees}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  نصيب القطعة من التكاليف الإدارية الموحدة ({profile.currencySymbol})
                </label>
                <NumberInput
                  value={adminExpensesShare}
                  onChange={setAdminExpensesShare}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold font-mono outline-none"
                />
              </div>
            </div>

            {/* Wide Notes Box: "ملاحظات شخصية" */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                ملاحظات شخصية (أسرار الصنعة، تفاصيل التنفيذ، توصيات صقر الشمساوية AI)
              </label>
              <textarea
                rows={4}
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="سجل هنا أي تفاصيل خاصة بدرجة شد الخيط، لون الصبغة، متطلبات العميل، أو ملاحظات نقلها الذكاء الاصطناعي..."
                className="w-full p-3.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-stone-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CORE FUNCTIONAL ACTIONS DIRECTLY AT THE BOTTOM VIEW */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
        <div>
          <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">
            تأكيد واعتماد بطاقة تسعير المنتج
          </h4>
          <p className="text-xs text-stone-500">
            حفظ الحسابات في الأرشيف أو تحديث السجل المفتوح أو إنشاء عرض سعر واتساب فوري للعميل
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {existingRecordId ? (
            <button
              type="button"
              onClick={handleSaveProduct}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>[زر حفظ التعديلات]</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveProduct}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg shadow-amber-600/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>[زر حفظ المنتج في الأرشيف]</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const selectedSection = MAIN_SECTIONS.find((s) => s.id === selectedSectionId);
              const selectedCraft = SUB_CRAFTS_REGISTRY.find((c) => c.id === selectedCraftId);
              const record: SavedProductRecord = {
                id: existingRecordId || `prod_${Date.now()}`,
                tenantId: profile.tenantId,
                workshopId: profile.tenantId,
                productName: productName || `منتج ${category}`,
                productSerialNumber: initialRecord?.productSerialNumber,
                productCode: initialRecord?.productCode,
                mainSectionId: selectedSectionId,
                mainSectionName: selectedSection?.nameAr || selectedSectionId,
                craftId: selectedCraftId,
                craftName: selectedCraft?.nameAr || selectedCraftId,
                productType: category,
                category,
                costPrice,
                retailPrice,
                wholesalePrice,
                wholesaleMarginDiscountPercent,
                input: calculationInput,
                output,
                imageUrl: productImageUrl,
                isActive: true,
                createdAt: initialRecord?.createdAt || Date.now(),
                updatedAt: Date.now(),
              };
              onOpenWhatsAppShare(record);
            }}
            className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-300 dark:border-emerald-800"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>[زر مشاركة عرض السعر عبر واتساب]</span>
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
