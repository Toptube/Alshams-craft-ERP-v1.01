import React, { useState, useEffect } from 'react';

export interface NumberInputProps {
  value?: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  title?: string;
}

/**
 * تحويل الأرقام العربية الهندية والفاصلة إلى أرقام إنجليزية مع نقطة عشرية
 */
export function normalizeNumericString(input: string): string {
  const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const easternArabicDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let normalized = input;
  // استبدال الأرقام العربية الهندية والمشرقية
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replaceAll(arabicIndicDigits[i], String(i));
    normalized = normalized.replaceAll(easternArabicDigits[i], String(i));
  }

  // استبدال الفواصل العربية والإنجليزية بالعلامة العشرية النقطية
  normalized = normalized.replace(/[,،٫\u066B]/g, '.');
  normalized = normalized.replace(/[\u066C]/g, ''); // إزالة فواصل الآلاف

  // تصفية المحارف غير الصالحة والسماح بنقطة عشرية واحدة وإشارة سالب واحدة في البداية
  let clean = '';
  let hasDot = false;
  let hasMinus = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === '-' && i === 0 && !hasMinus) {
      hasMinus = true;
      clean += char;
    } else if (char === '.' && !hasDot) {
      hasDot = true;
      clean += char;
    } else if (char >= '0' && char <= '9') {
      clean += char;
    }
  }

  return clean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder,
  min,
  max,
  className = '',
  disabled = false,
  id,
  name,
  readOnly = false,
  autoFocus = false,
  onBlur,
  onFocus,
  required,
  title,
}) => {
  const formatIncoming = (val: number | string | undefined): string => {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') {
      if (isNaN(val)) return '';
      return String(val);
    }
    return String(val);
  };

  const [text, setText] = useState<string>(() => formatIncoming(value));
  const [isFocused, setIsFocused] = useState(false);

  // مزامنة القيمة القادمة من المكوّن الأب دون مسح ما يكتبه المستخدم حالياً
  useEffect(() => {
    const parsedCurrentText = parseFloat(text);
    const numVal = typeof value === 'number' ? value : parseFloat(String(value ?? ''));

    // لو المستخدم يكتب داخل الحقل حالياً، لا نعدل النص إذا كانت القيمة الحسابية متطابقة
    if (isFocused) {
      if (text === '' && (value === undefined || value === null || value === '' || value === 0)) {
        return;
      }
      if (!isNaN(parsedCurrentText) && parsedCurrentText === numVal) {
        return;
      }
    }

    if (isNaN(parsedCurrentText) || parsedCurrentText !== numVal || text === '') {
      setText(formatIncoming(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = normalizeNumericString(raw);

    setText(clean);

    if (clean === '' || clean === '-' || clean === '.') {
      onChange(min !== undefined && min > 0 ? min : 0);
      return;
    }

    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (text.endsWith('.')) {
      const fixed = text.slice(0, -1);
      setText(fixed);
      const parsed = parseFloat(fixed);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    } else if (text === '' && typeof value === 'number' && value !== 0) {
      setText(String(value));
    }
    if (onBlur) onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={isFocused ? '' : placeholder}
      className={className}
      disabled={disabled}
      id={id}
      name={name}
      readOnly={readOnly}
      autoFocus={autoFocus}
      required={required}
      title={title}
    />
  );
};
